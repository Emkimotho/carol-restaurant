/* ------------------------------------------------------------------ */
/*  File: app/api/drivers/route.ts                                    */
/* ------------------------------------------------------------------ */
/*  GET /api/drivers?status=online                                    */
/*  Returns the list of driver *users* that have a DriverProfile row  */
/*  (optionally filtered by ?status=online or ?status=active)         */
/* ------------------------------------------------------------------ */

import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

/** GET /api/drivers */
export async function GET(req: NextRequest) {
  // Grab the incoming query-string
  const status = req.nextUrl.searchParams.get('status')?.toUpperCase() ?? null;

  // Base filter: user must have a DriverProfile row
  const where: any = {
    driverProfile: { isNot: null },
  };

  // Apply status filtering if requested
  if (status === 'ONLINE') {
    // only drivers who have toggled themselves online
    where.isOnline = true;
  } else if (status === 'ACTIVE') {
    // all drivers whose account is active
    where.status = 'ACTIVE';
  }

  // Fetch minimal fields for assignment dropdowns
  const drivers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
    orderBy: {
      firstName: 'asc',
    },
  });

  return NextResponse.json(drivers);
}
