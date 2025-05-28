/* ------------------------------------------------------------------ */
/*  File: app/api/drivers/route.ts                                    */
/* ------------------------------------------------------------------ */
/*  GET /api/drivers?status=online                                    */
/*  Returns the list of driver *users* that have a DriverProfile row  */
/*  (optionally filtered by ?status=online or ?status=active)         */
/* ------------------------------------------------------------------ */

import { NextResponse, NextRequest } from 'next/server';
import { prisma }                    from '@/lib/prisma';

/** GET /api/drivers */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  /* Optional query string: ?status=online|active */
  const status = searchParams.get('status')?.toUpperCase() ?? null;

  /* Base filter: a user that HAS a DriverProfile row */
  const where: any = {
    driverProfile: { isNot: null },   // ← Prisma v6 syntax
  };

  /* If caller asked for status filtering, add it */
  if (status === 'ONLINE' || status === 'ACTIVE') {
    where.status = 'ACTIVE';          // replace with your “online” column if different
  }

  /* Pull just enough for an assignment drop‑down */
  const drivers = await prisma.user.findMany({
    where,
    select: { id: true, firstName: true, lastName: true },
  });

  return NextResponse.json(drivers);
}
