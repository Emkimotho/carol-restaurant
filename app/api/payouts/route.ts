// File: app/api/payouts/route.ts

import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "../../../lib/prisma";

export async function GET(request: NextRequest) {
  // 1️⃣ Authenticate via JWT token (reads NEXTAUTH_SECRET)
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // 2️⃣ Extract user ID and roles from the token
  const rawId = token.sub;
  const userId = rawId ? parseInt(rawId, 10) : undefined;
  const roles = Array.isArray(token.roles)
    ? token.roles.map((r: string) => r.toLowerCase())
    : typeof token.role === "string"
      ? [token.role.toLowerCase()]
      : [];
  const isAdmin  = roles.includes("admin");
  const isServer = roles.includes("server");
  const isDriver = roles.includes("driver");

  // 3️⃣ Parse query parameters
  const url      = new URL(request.url);
  const paidParm = url.searchParams.get("paid");
  const fromParm = url.searchParams.get("from");
  const toParm   = url.searchParams.get("to");
  const mode     = url.searchParams.get("mode");    // "server" or "driver"

  // 4️⃣ Build Prisma `where` filter
  const where: any = {};

  // paid/unpaid filter
  if (paidParm === "true")  where.paid = true;
  if (paidParm === "false") where.paid = false;

  // date‐range filter
  if (fromParm || toParm) {
    where.createdAt = {};
    if (fromParm) {
      const d = new Date(fromParm);
      if (!isNaN(d.valueOf())) where.createdAt.gte = d;
    }
    if (toParm) {
      const d = new Date(toParm);
      if (!isNaN(d.valueOf())) {
        d.setHours(23,59,59,999);
        where.createdAt.lte = d;
      }
    }
  }

  // 5️⃣ Role‐based & mode‐based filtering
  if (!isAdmin) {
    // restrict to own payouts
    where.userId = userId;

    // server‐only view: zero‐fee orders
    if (isServer && mode === "server") {
      where.order = { totalDeliveryFee: { equals: 0 } };
    }

    // driver‐only view: paid‐delivery orders
    if (isDriver && mode === "driver") {
      where.order = { totalDeliveryFee: { gt: 0 } };
    }
  }

  // 6️⃣ Fetch from the database
  const payouts = await prisma.payout.findMany({
    where,
    include: {
      user:  { select: { id: true, firstName: true, lastName: true } },
      order: { select: { orderId: true, totalDeliveryFee: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 7️⃣ Return the results
  return NextResponse.json(payouts);
}
