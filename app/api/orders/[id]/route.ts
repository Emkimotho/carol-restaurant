// File: app/api/orders/[id]/route.ts
// Description: Handles GET, PATCH, and DELETE for a single order, including status history, WebSocket broadcasts,
// and automatic cash‐collection creation on “Collect Cash & En Route” plus payout creation on delivery.

import { NextRequest, NextResponse }              from 'next/server';
import { getServerSession }                       from 'next-auth/next';
import { authOptions }                            from '@/lib/auth';
import { prisma }                                 from '@/lib/prisma';
import {
  OrderStatus,
  PaymentMethod,
  CashCollectionStatus,
}                                                  from '@prisma/client';
import { broadcast }                              from '../live/route';

const orderIdFrom = (req: NextRequest) =>
  new URL(req.url).pathname.split('/').pop()!;

/* ───────────────────────────── GET ─────────────────────────────────── */
export async function GET(req: NextRequest) {
  const id = orderIdFrom(req);
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer:      { select: { firstName: true, lastName: true, email: true } },
        driver:        { select: { id: true, firstName: true, lastName: true } },
        staff:         { select: { id: true, firstName: true, lastName: true } },
        lineItems:     { include: { menuItem: true } },
        statusHistory: {
          orderBy: { timestamp: 'asc' },
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        cashCollection: true,   // include cash-collection details
      },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err: any) {
    console.error('[GET /api/orders/:id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ──────────────────────────── PATCH ────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const id      = orderIdFrom(req);
  const payload = (await req.json()) as Partial<{
    status:   OrderStatus;
    driverId: number | null;
    [k: string]: unknown;
  }>;

  // 1 – identify acting user
  const session     = await getServerSession(authOptions);
  const actorId     = session?.user?.id ? Number(session.user.id) : undefined;
  const actorExists = actorId
    ? !!(await prisma.user.findUnique({ where: { id: actorId } }))
    : false;

  try {
    // 2 – record driver assignment history
    if ('driverId' in payload) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status:  OrderStatus.IN_PROGRESS,
          ...(actorExists ? { userId: actorId } : {}),
        },
      });
    }

    // 3 – record explicit status change history
    if (payload.status) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status:  payload.status,
          ...(actorExists ? { userId: actorId } : {}),
        },
      });
    }

    // 4 – apply the status (and stamp deliveredAt if delivered)
    const update: any = { ...payload };
    if (payload.status === OrderStatus.DELIVERED) {
      update.deliveredAt = new Date();
    }
    const updated = await prisma.order.update({
      where: { id },
      data: update,
    });

    // 5 – when a server “Collect Cash & En Route” (PICKED_UP_BY_DRIVER) on a cash order,
    //      create a CashCollection record with status=PENDING
    if (
      payload.status === OrderStatus.PICKED_UP_BY_DRIVER &&
      updated.paymentMethod === PaymentMethod.CASH &&
      actorExists
    ) {
      await prisma.cashCollection.create({
        data: {
          orderId:  id,
          serverId: actorId!,
          amount:   updated.totalAmount,
          status:   CashCollectionStatus.PENDING,
        },
      });
    }

    // 6 – create payouts on delivery
    if (payload.status === OrderStatus.DELIVERED) {
      // driver payout
      if (updated.driverId && updated.driverPayout > 0) {
        await prisma.payout.create({
          data: {
            userId:   updated.driverId,
            orderId:  updated.id,
            amount:   updated.driverPayout,
            category: 'DRIVER_PAYOUT',
          },
        });
      }
      // server tip payout
      if (updated.staffId && updated.tipAmount > 0) {
        await prisma.payout.create({
          data: {
            userId:   updated.staffId,
            orderId:  updated.id,
            amount:   updated.tipAmount,
            category: 'SERVER_TIP',
          },
        });
      }
    }

    // 7 – broadcast WebSocket updates
    if ('driverId' in payload) {
      broadcast({ id, field: 'driverId', value: payload.driverId });
    }
    if (payload.status) {
      broadcast({ id, field: 'status',   value: payload.status });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[PATCH /api/orders/:id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────────────────── DELETE ────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const id = orderIdFrom(req);
  try {
    await prisma.order.delete({ where: { id } });
    broadcast({ id, field: 'deleted', value: true });
    return NextResponse.json(null, { status: 204 });
  } catch (err: any) {
    console.error('[DELETE /api/orders/:id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
