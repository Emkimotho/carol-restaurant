// File: app/api/payouts/route.ts
// Description: Lists payouts (paid/unpaid) with optional date‐range filtering, respects user roles.

import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

export async function GET(req: Request) {
  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // 2. Extract user ID and roles
  const rawId = (session.user as any).id ?? (session.user as any).sub;
  const userId = typeof rawId === "string" ? parseInt(rawId, 10) : Number(rawId);
  const roles = Array.isArray((session.user as any).roles)
    ? (session.user as any).roles
    : [];
  const isAdmin = roles.includes("ADMIN");

  // 3. Parse query params
  const url       = new URL(req.url);
  const paidParm  = url.searchParams.get("paid");
  const fromParm  = url.searchParams.get("from");  // ISO date e.g. "2025-05-01"
  const toParm    = url.searchParams.get("to");    // ISO date e.g. "2025-05-31"

  // 4. Build Prisma 'where' filter
  const where: any = {};

  // paid/unpaid filter
  if (paidParm === "true")  where.paid = true;
  if (paidParm === "false") where.paid = false;

  // date-range filter
  if (fromParm || toParm) {
    where.createdAt = {};
    if (fromParm) {
      const fromDate = new Date(fromParm);
      if (!isNaN(fromDate.valueOf())) {
        where.createdAt.gte = fromDate;
      }
    }
    if (toParm) {
      const toDate = new Date(toParm);
      if (!isNaN(toDate.valueOf())) {
        // include entire 'to' day by setting time to end of day
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }
  }

  // non-admins only see their own payouts
  if (!isAdmin) {
    where.userId = userId;
  }

  // 5. Query
  const payouts = await prisma.payout.findMany({
    where,
    include: {
      user:  { select: { id: true, firstName: true, lastName: true } },
      order: { select: { orderId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 6. Return
  return NextResponse.json(payouts);
}
