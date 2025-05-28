// File: app/api/orders/[id]/accept/route.ts

import { NextResponse }     from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions }      from '@/lib/auth';      // your NextAuth config
import { prisma }           from '@/lib/prisma';
import { OrderStatus }      from '@prisma/client';
import { broadcast }        from '../../live/route';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    // 1. Grab the logged-in user from the session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const driverId = Number(session.user.id);

    // 2. Only assign if unclaimed
    const result = await prisma.order.updateMany({
      where: { id: orderId, driverId: null },
      data:  {
        driverId,
        status: OrderStatus.IN_PROGRESS,
      },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Taken' }, { status: 409 });
    }

    // 3. Audit – now using userId instead of changedBy
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: OrderStatus.IN_PROGRESS,
        userId: driverId,
      },
    });

    // 4. Broadcast updates
    broadcast({ id: orderId, field: 'driverId', value: driverId });
    broadcast({ id: orderId, field: 'status',   value: OrderStatus.IN_PROGRESS });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[PATCH /api/orders/:id/accept] —', err);
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
