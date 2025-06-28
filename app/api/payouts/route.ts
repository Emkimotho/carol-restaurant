// Description: Lists payouts (paid/unpaid) with optional date‐range filtering, respects user roles,
//              and splits server vs driver via `mode` query param.

import { NextResponse } from "next/server";
import prisma            from "../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions }      from "../../../lib/auth";

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
    ? (session.user as any).roles.map((r: string) => r.toLowerCase())
    : [];
  const isAdmin  = roles.includes("admin");
  const isServer = roles.includes("server");
  const isDriver = roles.includes("driver");

  // 3. Parse query params
  const url      = new URL(req.url);
  const paidParm = url.searchParams.get("paid");
  const fromParm = url.searchParams.get("from");
  const toParm   = url.searchParams.get("to");
  const mode     = url.searchParams.get("mode");    // "server" or "driver"

  // 4. Build Prisma 'where' filter
  const where: any = {};

  // paid/unpaid filter
  if (paidParm === "true")  where.paid = true;
  if (paidParm === "false") where.paid = false;

  // date-range filter
  if (fromParm || toParm) {
    where.createdAt = {};
    if (fromParm) {
      const d = new Date(fromParm);
      if (!isNaN(d.valueOf())) where.createdAt.gte = d;
    }
    if (toParm) {
      const d = new Date(toParm);
      if (!isNaN(d.valueOf())) {
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }
  }

  // 5. Role‐based & mode‐based filtering
  if (!isAdmin) {
    where.userId = userId;

    // if explicitly server‐only
    if (isServer && mode === "server") {
      where.order = { totalDeliveryFee: { equals: 0 } };
    }
    // if explicitly driver‐only
    if (isDriver && mode === "driver") {
      where.order = { totalDeliveryFee: { gt: 0 } };
    }
  }

  // 6. Query
  const payouts = await prisma.payout.findMany({
    where,
    include: {
      user:  { select: { id: true, firstName: true, lastName: true } },
      order: { select: { orderId: true, totalDeliveryFee: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 7. Return
  return NextResponse.json(payouts);
}
