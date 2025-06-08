// File: app/api/orders/cash-collections/route.ts
// ------------------------------------------------------------------
// • GET  /api/orders/cash-collections
//    – List cash-collection records with optional filters
//    – NEW: ?groupBy=server returns aggregate totals per server (PENDING by default)
// • POST /api/orders/cash-collections
//    – Create a new cash-collection record (status defaults to PENDING)
// ------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CashCollectionStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId        = searchParams.get('orderId');
    const statusParam    = searchParams.get('status');      // "PENDING" or "SETTLED"
    const serverIdParam  = searchParams.get('serverId');
    const settledByParam = searchParams.get('settledById');
    const groupByParam   = searchParams.get('groupBy');     // "server"

    /* ---------- Build filters ---------- */
    const where: any = {};
    if (orderId) {
      where.orderId = orderId;
    }
    if (statusParam && ['PENDING', 'SETTLED'].includes(statusParam)) {
      where.status = CashCollectionStatus[statusParam as keyof typeof CashCollectionStatus];
    }
    if (serverIdParam) {
      where.serverId = Number(serverIdParam);
    }
    if (settledByParam) {
      where.settledById = Number(settledByParam);
    }

    /* ---------- Group‐by‐server aggregate ---------- */
    if (groupByParam === 'server') {
      // Default to PENDING if no status filter provided
      if (!where.status) {
        where.status = CashCollectionStatus.PENDING;
      }

      // 1) Fetch matching cashCollection rows with server info
      const records = await prisma.cashCollection.findMany({
        where,
        include: {
          server: {
            select: { id: true, firstName: true, lastName: true }
          },
        },
      });

      // 2) Aggregate totals in JS
      const map = new Map<number, { server: { id: number; firstName: string; lastName: string }; pendingOrders: number; totalAmount: number }>();

      records.forEach((r) => {
        const key = r.serverId;
        if (!map.has(key)) {
          map.set(key, {
            server: {
              id: r.server.id,
              firstName: r.server.firstName,
              lastName: r.server.lastName,
            },
            pendingOrders: 0,
            totalAmount: 0,
          });
        }
        const agg = map.get(key)!;
        agg.pendingOrders += 1;
        agg.totalAmount   += r.amount;
      });

      return NextResponse.json(Array.from(map.values()));
    }

    /* ---------- Normal list: one record per cashCollection ---------- */
    const records = await prisma.cashCollection.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      include: {
        order: {
          select: { orderId: true, totalAmount: true, paymentMethod: true }
        },
        server: {
          select: { id: true, firstName: true, lastName: true }
        },
        settledBy: {
          select: { id: true, firstName: true, lastName: true }
        },
      },
    });

    return NextResponse.json(records);
  } catch (err: any) {
    console.error('[GET /api/orders/cash-collections] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Ensure authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      orderId:   string;
      serverId:  number;
      amount:    number;
      status?:   'PENDING' | 'SETTLED';
    };

    // Validate payload
    if (
      !body.orderId ||
      typeof body.serverId !== 'number' ||
      typeof body.amount !== 'number'
    ) {
      return NextResponse.json(
        { error: 'orderId, serverId, and amount are required' },
        { status: 400 }
      );
    }

    const rec = await prisma.cashCollection.create({
      data: {
        orderId:  body.orderId,
        serverId: body.serverId,
        amount:   body.amount,
        status:   body.status
          ? CashCollectionStatus[body.status]
          : CashCollectionStatus.PENDING,
      },
      include: {
        order:    { select: { orderId: true, totalAmount: true, paymentMethod: true } },
        server:   { select: { id: true, firstName: true, lastName: true } },
        settledBy:{ select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(rec, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/orders/cash-collections] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
