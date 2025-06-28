// File: app/api/orders/reconcile/route.ts
// ------------------------------------------------------------------
// • POST /api/orders/reconcile
//   – For every friendly order-code sent in the payload:
//       1. Authenticates cashier
//       2. Parses payload { orderIds: string[], cashReceived: number }
//       3. Maps friendly → internal Order.id
//       4. Fetches all CashCollection rows for those internal IDs
//       5. Computes sum only over PENDING collections (in cents)
//       6. Validates cashReceived >= expectedPending; if short, returns 400
//       7. Computes changeDue
//       8. Bulk-fetches Order records (to get cloverOrderId) by internal ID
//       9. For each friendlyId:
//            • No CashCollection → skip
//            • Already SETTLED → skip
//            • Missing cloverOrderId → skip
//            • Else calls ensureCashTender(...)
//            • Marks CashCollection as SETTLED
//      10. Returns 207 on partial failure, 200 if all succeed
// ------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CashCollectionStatus } from '@prisma/client';
import { ensureCashTender } from '@/lib/clover/orderService';

export async function POST(req: NextRequest) {
  // 1. Authenticate cashier
  const session = await getServerSession(authOptions);
  const cashierId = session?.user?.id ? Number(session.user.id) : null;
  if (!cashierId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate JSON payload
  let payload: unknown;
  try {
    payload = await req.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('orderIds' in payload) ||
    !('cashReceived' in payload)
  ) {
    return NextResponse.json(
      { error: 'Payload must have orderIds (array) and cashReceived (number)' },
      { status: 400 }
    );
  }
  const { orderIds, cashReceived } = payload as {
    orderIds: unknown;
    cashReceived: unknown;
  };
  if (!Array.isArray(orderIds) || orderIds.length === 0 || !orderIds.every(id => typeof id === 'string')) {
    return NextResponse.json({ error: 'orderIds required (non-empty array of strings)' }, { status: 400 });
  }
  if (typeof cashReceived !== 'number' || !Number.isFinite(cashReceived) || cashReceived < 0) {
    return NextResponse.json({ error: 'cashReceived must be a non-negative finite number' }, { status: 400 });
  }
  const friendlyOrderIds = orderIds as string[];

  // 3. Map friendly → internal Order.id
  const orderRecords = await prisma.order.findMany({
    where: { orderId: { in: friendlyOrderIds } },
    select: { orderId: true, id: true },
  });
  // Build maps
  const friendlyToInternal = new Map(orderRecords.map(o => [o.orderId, o.id]));
  const internalIds = orderRecords.map(o => o.id);

  // 4. Fetch all CashCollection rows for those internal IDs
  const allCollections = await prisma.cashCollection.findMany({
    where: { orderId: { in: internalIds } },
    select: { orderId: true, amount: true, status: true },
  });

  // 5. Filter only PENDING, compute expected sum in cents
  const pendingEntries = allCollections
    .filter(c => c.status === CashCollectionStatus.PENDING)
    .map(c => ({
      internalId: c.orderId,
      friendlyId: orderRecords.find(o => o.id === c.orderId)!.orderId,
      amount: c.amount,
    }));

  if (pendingEntries.length === 0) {
    return NextResponse.json({ error: 'No pending cash collections to reconcile' }, { status: 400 });
  }

  const expectedPendingCents = pendingEntries.reduce(
    (sum, e) => sum + Math.round(e.amount * 100),
    0
  );
  const cashReceivedCents = Math.round(cashReceived * 100);

  // 6. Validate cashReceived >= expectedPending
  if (cashReceivedCents < expectedPendingCents) {
    const shortCents = expectedPendingCents - cashReceivedCents;
    const shortStr = (shortCents / 100).toFixed(2);
    return NextResponse.json(
      { error: `Short by $${shortStr}` },
      { status: 400 }
    );
  }
  const changeCents = cashReceivedCents - expectedPendingCents;

  // 7. Bulk-fetch Orders to get cloverOrderId by internal ID
  const ordersWithClover = await prisma.order.findMany({
    where: { id: { in: internalIds } },
    select: { id: true, orderId: true, cloverOrderId: true },
  });
  const internalToClover = new Map(
    ordersWithClover.map(o => [o.id, { friendlyId: o.orderId, cloverOrderId: o.cloverOrderId }])
  );

  // 8. Iterate over each friendlyId in original list
  const results: Array<{ orderId: string; ok: boolean; message?: string }> = [];
  for (const friendlyId of friendlyOrderIds) {
    const internalId = friendlyToInternal.get(friendlyId);
    if (!internalId) {
      results.push({ orderId: friendlyId, ok: false, message: 'Order not found' });
      continue;
    }

    const coll = allCollections.find(c => c.orderId === internalId);
    if (!coll) {
      results.push({ orderId: friendlyId, ok: false, message: 'No CashCollection record' });
      continue;
    }
    if (coll.status === CashCollectionStatus.SETTLED) {
      results.push({ orderId: friendlyId, ok: true, message: 'Already settled' });
      continue;
    }

    const cloverInfo = internalToClover.get(internalId);
    const cloverOrderId = cloverInfo?.cloverOrderId;
    if (!cloverOrderId) {
      results.push({ orderId: friendlyId, ok: false, message: 'Missing cloverOrderId' });
      continue;
    }

    // 9. Ensure CASH tender in Clover
    try {
      await ensureCashTender(cloverOrderId, coll.amount);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('409') || msg.toLowerCase().includes('already exists')) {
        // treat conflict as OK
      } else {
        results.push({ orderId: friendlyId, ok: false, message: `Clover error: ${msg}` });
        continue;
      }
    }

    // 10. Mark CashCollection as SETTLED
    try {
      await prisma.cashCollection.update({
        where: { orderId: internalId },
        data: {
          status: CashCollectionStatus.SETTLED,
          settledAt: new Date(),
          settledById: cashierId,
        },
      });
      results.push({ orderId: friendlyId, ok: true });
    } catch (err: any) {
      results.push({ orderId: friendlyId, ok: false, message: 'Failed to mark SETTLED' });
    }
  }

  // 11. Return response (207 if any failed, else 200)
  const failed = results.filter(r => !r.ok);
  const changeDue = (changeCents / 100).toFixed(2);
  if (failed.length > 0) {
    return NextResponse.json({ success: false, results, changeDue }, { status: 207 });
  }
  return NextResponse.json({ success: true, changeDue }, { status: 200 });
}
