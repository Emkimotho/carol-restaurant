// File: app/api/servers/earnings/route.ts
/* ======================================================================
   GET /api/servers/earnings
   Tip earnings for on-course servers (golf orders, totalDeliveryFee = 0)
   ====================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession }          from 'next-auth/next';
import { authOptions }               from '@/lib/auth';
import prisma                        from '@/lib/prisma';
import { OrderStatus }               from '@prisma/client';
import { DateTime }                  from 'luxon';

type Period = 'day' | 'week' | 'month' | 'year';

/* ───────── utilities ───────── */

const inServerRole = (s: any) =>
  (Array.isArray(s?.user?.roles) ? s.user.roles : [])
    .some((r: string) => ['server', 'staff'].includes(r.toLowerCase()));

const parseYMD = (s: string) => {
  const [y,m,d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
};

function nyRange(p: Period) {
  const ny = DateTime.now().setZone('America/New_York');
  const start = (
    p === 'week'  ? ny.minus({ days: 6 }) :
    p === 'month' ? ny.minus({ months: 1 }) :
    p === 'year'  ? ny.minus({ years: 1 }) :
    ny
  ).startOf('day');
  const end = ny.endOf('day');               // always include today
  return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
}

/* ───────── handler ───────── */

export async function GET(req: NextRequest) {
  /* 1 ─ auth */
  const sess = await getServerSession(authOptions);
  if (!sess?.user)            return NextResponse.json({ error:'Unauthorized' }, { status:401 });
  if (!inServerRole(sess))    return NextResponse.json({ error:'Forbidden'    }, { status:403 });

  /* 2 ─ params */
  const q       = req.nextUrl.searchParams;
  const staffId = Number(q.get('staffId')) || Number(sess.user.id);
  const wantRows = q.get('orders') === 'true';

  /* 3 ─ range */
  let from: Date, to: Date;
  if (q.has('from') && q.has('to')) {
    const f = DateTime.fromObject(parseYMD(q.get('from')!), { zone:'America/New_York' }).startOf('day');
    const t = DateTime.fromObject(parseYMD(q.get('to')!),   { zone:'America/New_York' }).endOf('day');
    from = f.toUTC().toJSDate();
    to   = t.toUTC().toJSDate();
  } else {
    ({ start: from, end: to } = nyRange((q.get('period') as Period) ?? 'day'));
  }

  /* 4 ─ golf-order filter */
  const where = {
    staffId,
    status:           OrderStatus.DELIVERED,
    totalDeliveryFee: 0,                       // golf
    deliveredAt:      { gte: from, lte: to },
  };

  /* 5 ─ totals */
  const { _sum } = await prisma.order.aggregate({
    where,
    _sum: { tipAmount: true },
  });

  /* 6 ─ rows (optional) */
  let orders: any[] = [];
  if (wantRows) {
    const raw = await prisma.order.findMany({
      where,
      select: {
        orderId:      true,
        deliveredAt:  true,
        tipAmount:    true,
        deliveryType: true,
        staffId:      true,
      },
      orderBy: { deliveredAt: 'desc' },
    });

    orders = raw.map(o => ({
      orderId:        o.orderId,
      deliveredAt:    o.deliveredAt?.toISOString() ?? null,
      tipAmount:      o.tipAmount ?? 0,
      deliveryType:   o.deliveryType,
      tipRecipientId: o.staffId,
    }));
  }

  /* 7 ─ response */
  return NextResponse.json({
    range:  { from: from.toISOString(), to: to.toISOString() },
    totals: { tipAmount: _sum.tipAmount ?? 0 },
    orders,
  });
}
