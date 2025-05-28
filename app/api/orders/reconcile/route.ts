// File: app/api/orders/reconcile/route.ts
// ------------------------------------------------------------------
// • POST /api/orders/reconcile
//   – Marks each CashCollection status → SETTLED, stamps settledAt & settledById
//   – [TODO] integrate your Clover cash‐tender call where noted
// ------------------------------------------------------------------

import { NextRequest, NextResponse }          from 'next/server';
import { getServerSession }                   from 'next-auth/next';
import { authOptions }                        from '@/lib/auth';
import { prisma }                             from '@/lib/prisma';
import { CashCollectionStatus }               from '@prisma/client';

export async function POST(req: NextRequest) {
  // 1. Authenticate cashier
  const session   = await getServerSession(authOptions);
  const cashierId = session?.user?.id ? Number(session.user.id) : null;
  if (!cashierId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Parse body
    const { orderIds, cashReceived } = await req.json() as {
      orderIds:    string[];
      cashReceived: number;
    };
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds required' }, { status: 400 });
    }

    // 3. Process each order
    for (const orderId of orderIds) {
      // 3a. Find the CashCollection record
      const collection = await prisma.cashCollection.findUnique({
        where: { orderId }
      });
      if (!collection) {
        console.warn(`No CashCollection record for orderId=${orderId}`);
        continue;
      }

      // 3b. [TODO] Call your Clover cash‐tender API here
      // e.g.:
      // await yourCloverHelper.createCashTender({
      //   orderId,
      //   amount: collection.amount
      // });

      // 3c. Mark CashCollection as SETTLED
      await prisma.cashCollection.update({
        where: { orderId },
        data: {
          status:      CashCollectionStatus.SETTLED,
          settledAt:   new Date(),
          settledById: cashierId
        }
      });
    }

    // 4. Return success
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/orders/reconcile] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
