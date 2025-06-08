// File: app/api/drivers/earnings/route.ts
/**
 * Driver earnings endpoint — builds NY-local ranges properly.
 *
 * Query params
 *  • ?period=day|week|month|year   (default=day)
 *  • ?from=YYYY-MM-DD&to=YYYY-MM-DD (custom)
 *  • &orders=true                   include per-order rows
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession }          from 'next-auth/next';
import { authOptions }               from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import { OrderStatus }               from '@prisma/client';
import { DateTime }                  from 'luxon';

type Period = 'day' | 'week' | 'month' | 'year';

/** Parse a YYYY-MM-DD date into luxon-friendly parts */
function parseYMD(s: string) {
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
}

/** Build start/end UTC JS Dates for a given NY-based period */
function buildNYRange(p: Period): { start: Date; end: Date } {
  const now = DateTime.now().setZone('America/New_York');
  let startDT = now.startOf('day');
  let endDT   = startDT.plus({ days: 1 });

  if (p === 'week') {
    startDT = now.startOf('day').minus({ days: 6 });
    endDT   = now.startOf('day').plus({ days: 1 });
  } else if (p === 'month') {
    startDT = now.startOf('day').minus({ months: 1 });
    endDT   = now.startOf('day').plus({ days: 1 });
  } else if (p === 'year') {
    startDT = now.startOf('day').minus({ years: 1 });
    endDT   = now.startOf('day').plus({ days: 1 });
  }

  return {
    start: startDT.toUTC().toJSDate(),
    end:   endDT.toUTC().toJSDate(),
  };
}

export async function GET(req: NextRequest) {
  // 1) Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Determine driverId from query or session
  const qs       = req.nextUrl.searchParams;
  const driverId = Number(qs.get('driverId')) || Number(session.user.id);

  // 3) Authorization: driver sees own earnings, admins can see any
  const rawRoles = (session.user as any).roles;
  const roles: string[] = Array.isArray(rawRoles) ? rawRoles : [];
  const isAdmin = roles.includes('ADMIN') || roles.includes('SUPERADMIN');
  if (Number(session.user.id) !== driverId && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 4) Build date range (NY-local, then convert to UTC)
  let start: Date, end: Date;
  if (qs.has('from') && qs.has('to')) {
    const fromParts = parseYMD(qs.get('from')!);
    const toParts   = parseYMD(qs.get('to')!);

    const fromDT = DateTime.fromObject(fromParts, { zone: 'America/New_York' }).startOf('day');
    const toDT   = DateTime.fromObject(toParts,   { zone: 'America/New_York' }).startOf('day').plus({ days: 1 });

    start = fromDT.toUTC().toJSDate();
    end   = toDT.toUTC().toJSDate();
  } else {
    const period = (qs.get('period') as Period) ?? 'day';
    ({ start, end } = buildNYRange(period));
  }

  // 5) (Optional) Log range for debugging
  console.log('[earnings] driverId=', driverId,
              'UTC range:', start.toISOString(), '–', end.toISOString());

  // 6) Prisma filter and aggregate
  const filter = {
    driverId,
    status:      OrderStatus.DELIVERED,
    deliveredAt: { gte: start, lt: end },
  };

  const { _sum: totals } = await prisma.order.aggregate({
    where: filter,
    _sum: { totalDeliveryFee: true, tipAmount: true },
  });

  // 7) Fetch per-order rows if requested
  interface Row {
    orderId:             string;
    deliveredAt:         Date | null;
    totalDeliveryFee:    number;
    tipAmount:           number;
    deliveryType:        string;
    driverPayout:        number | null;
    deliveryInstructions: string | null;
  }
  let orders: Row[] = [];
  if (qs.get('orders') === 'true') {
    orders = await prisma.order.findMany({
      where:  filter,
      select: {
        orderId:             true,
        deliveredAt:         true,
        totalDeliveryFee:    true,
        tipAmount:           true,
        deliveryType:        true,
        driverPayout:        true,
        deliveryInstructions: true,
      },
      orderBy: { deliveredAt: 'desc' },
    });
  }

  // 8) Respond
  return NextResponse.json({
    range: {
      from: start.toISOString(),
      to:   new Date(end.getTime() - 1).toISOString(),
    },
    totals,
    orders,
  });
}
