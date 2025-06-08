// File: app/api/servers/earnings/route.ts
/* ======================================================================
   Endpoint  : GET /api/servers/earnings
   Purpose   : Tip-earnings for on-course servers (staff)
   Query     :
     • staffId=<id>                     (optional → defaults to session user)
     • period=day|week|month|year       (default=day)
     • from=YYYY-MM-DD&to=YYYY-MM-DD    (custom range overrides period)
     • &orders=true                     (include per-order rows)
   Response  : { range:{ from, to }, totals:{ tipAmount }, orders:[ … ] }
   ====================================================================== */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession }          from 'next-auth/next';
import { authOptions }               from '@/lib/auth';
import prisma                        from '@/lib/prisma';
import { OrderStatus, DeliveryType } from '@prisma/client';
import { DateTime }                  from 'luxon';

type Period = 'day' | 'week' | 'month' | 'year';

/* ──────────────────────────── Helpers ──────────────────────────── */

/** Case-insensitive check that the user has a server/staff role */
function isServer(sess: any): boolean {
  const roles: string[] = Array.isArray(sess?.user?.roles) ? sess.user.roles : [];
  return roles.some(r => ['server', 'staff'].includes(r.toLowerCase()));
}

/** Parse a YYYY-MM-DD string to numeric parts for Luxon */
const parseYMD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
};

/** Build local-NY [start, end) JS Dates for a given period, then convert to UTC */
function buildNYRange(period: Period): { start: Date; end: Date } {
  const now     = DateTime.now().setZone('America/New_York');
  let startDT   = now.startOf('day');
  if (period === 'week')  startDT = now.minus({ days: 6 }).startOf('day');
  if (period === 'month') startDT = now.minus({ months: 1 }).startOf('day');
  if (period === 'year')  startDT = now.minus({ years: 1 }).startOf('day');
  const endDT = startDT.plus({ days: 1 });
  return {
    start: startDT.toUTC().toJSDate(),
    end:   endDT.toUTC().toJSDate(),
  };
}

/* ─────────────────────────── Handler ─────────────────────────── */

export async function GET(req: NextRequest) {
  // 1) Authenticate & authorize
  const session = await getServerSession(authOptions);
  if (!session?.user)           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isServer(session))       return NextResponse.json({ error: 'Forbidden'    }, { status: 403 });

  // 2) Determine staffId
  const qs      = req.nextUrl.searchParams;
  const staffId = Number(qs.get('staffId')) || Number(session.user.id);

  // 3) Compute NY-local date range → UTC
  let start: Date, end: Date;
  if (qs.has('from') && qs.has('to')) {
    const fromDT = DateTime.fromObject(parseYMD(qs.get('from')!), { zone: 'America/New_York' }).startOf('day');
    const toDT   = DateTime.fromObject(parseYMD(qs.get('to')!),   { zone: 'America/New_York' }).startOf('day').plus({ days: 1 });
    start = fromDT.toUTC().toJSDate();
    end   = toDT.toUTC().toJSDate();
  } else {
    const period = (qs.get('period') as Period) ?? 'day';
    ({ start, end } = buildNYRange(period));
  }

  // 4) Core filter: delivered, on-course orders for this staff
  const filter = {
    staffId,
    status:       OrderStatus.DELIVERED,
    deliveryType: { not: DeliveryType.DELIVERY },
    deliveredAt:  { gte: start, lt: end },
  };

  // 5) Aggregate totals (tips only)
  const { _sum: totals } = await prisma.order.aggregate({
    where: filter,
    _sum:  { tipAmount: true },
  });

  // 6) Optional per-order rows
  interface Row {
    orderId:        string;
    deliveredAt:    Date | null;
    tipAmount:      number;
    deliveryType:   DeliveryType;
    tipRecipientId: number | null;
  }

  let orders: Row[] = [];
  if (qs.get('orders') === 'true') {
    const raw = await prisma.order.findMany({
      where:   filter,
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
      deliveredAt:    o.deliveredAt,
      tipAmount:      o.tipAmount ?? 0,
      deliveryType:   o.deliveryType,
      tipRecipientId: o.staffId ?? null,
    }));
  }

  // 7) Respond
  return NextResponse.json({
    range: {
      from: start.toISOString(),
      to:   new Date(end.getTime() - 1).toISOString(),
    },
    totals,
    orders,
  });
}
