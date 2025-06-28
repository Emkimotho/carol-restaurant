// File: app/api/orders/cash-collections/route.ts
// ------------------------------------------------------------------
// • GET  /api/orders/cash-collections
//    – List cash-collection records with optional filters
//    – ?groupBy=server → aggregates by server (defaults to PENDING)
// • POST /api/orders/cash-collections
//    – Creates a cash-collection row (default PENDING)
//    – Idempotent: duplicate orderId returns the existing row
// ------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession }         from 'next-auth/next';
import { authOptions }              from '@/lib/auth';
import { prisma }                   from '@/lib/prisma';
import { CashCollectionStatus }     from '@prisma/client';

/* =================================================================== */
/*  GET                                                                */
/* =================================================================== */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId        = searchParams.get('orderId');
    const statusParam    = searchParams.get('status');      // "PENDING" | "SETTLED"
    const serverIdParam  = searchParams.get('serverId');
    const settledByParam = searchParams.get('settledById');
    const groupByParam   = searchParams.get('groupBy');     // "server"

    /* ---------- Build filters ---------- */
    const where: any = {};
    if (orderId) where.orderId = orderId;
    if (statusParam && ['PENDING', 'SETTLED'].includes(statusParam)) {
      where.status = CashCollectionStatus[statusParam as keyof typeof CashCollectionStatus];
    }
    if (serverIdParam)  where.serverId    = Number(serverIdParam);
    if (settledByParam) where.settledById = Number(settledByParam);

    /* ---------- Aggregate by server ---------- */
    if (groupByParam === 'server') {
      if (!where.status) where.status = CashCollectionStatus.PENDING;

      const records = await prisma.cashCollection.findMany({
        where,
        include: { server: { select: { id: true, firstName: true, lastName: true } } },
      });

      const map = new Map<
        number,
        { server: { id: number; firstName: string; lastName: string }; pendingOrders: number; totalAmount: number }
      >();

      records.forEach((r) => {
        const agg = map.get(r.serverId) ?? {
          server: { id: r.server.id, firstName: r.server.firstName, lastName: r.server.lastName },
          pendingOrders: 0,
          totalAmount:   0,
        };
        agg.pendingOrders += 1;
        agg.totalAmount   += r.amount;
        map.set(r.serverId, agg);
      });

      return NextResponse.json(Array.from(map.values()));
    }

    /* ---------- Normal list ---------- */
    const rows = await prisma.cashCollection.findMany({
      where,
      orderBy: { collectedAt: 'desc' },
      include: {
        order:     { select: { orderId: true, totalAmount: true, paymentMethod: true } },
        server:    { select: { id: true, firstName: true, lastName: true } },
        settledBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error('[GET /api/orders/cash-collections] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* =================================================================== */
/*  POST                                                               */
/* =================================================================== */
export async function POST(req: NextRequest) {
  /* ---------- Auth ---------- */
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  /* ---------- Parse body once ---------- */
  const body = (await req.json()) as {
    orderId:  string;
    serverId: number;
    amount:   number;
    status?:  'PENDING' | 'SETTLED';
  };

  if (!body.orderId || typeof body.serverId !== 'number' || typeof body.amount !== 'number') {
    return NextResponse.json(
      { error: 'orderId, serverId, and amount are required' },
      { status: 400 }
    );
  }

  try {
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
        order:     { select: { orderId: true, totalAmount: true, paymentMethod: true } },
        server:    { select: { id: true, firstName: true, lastName: true } },
        settledBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(rec, { status: 201 });
  } catch (err: any) {
    /* ---------- Duplicate (idempotent) ---------- */
    if (err?.code === 'P2002') {
      const existing = await prisma.cashCollection.findUnique({
        where: { orderId: body.orderId },   // reuse parsed body; no re-read
        include: {
          order:     { select: { orderId: true, totalAmount: true, paymentMethod: true } },
          server:    { select: { id: true, firstName: true, lastName: true } },
          settledBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      return NextResponse.json(existing, { status: 200 });
    }

    console.error('[POST /api/orders/cash-collections] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
