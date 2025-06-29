// File: app/api/payouts/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getToken }                 from "next-auth/jwt";
import prisma                       from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // 1️⃣ Authenticate via NextAuth’s JWT
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  });
  if (!token) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // 2️⃣ Pull out the numeric user ID and roles array
  const userId = typeof token.id === "string"
    ? parseInt(token.id, 10)
    : token.id as number;
  const roles = Array.isArray(token.roles)
    ? token.roles.map(r => r.toLowerCase())
    : [];

  const isAdmin  = roles.includes("admin");
  const isServer = roles.includes("server");
  const isDriver = roles.includes("driver");

  // 3️⃣ Parse query params
  const url      = new URL(req.url);
  const paidParm = url.searchParams.get("paid");
  const fromParm = url.searchParams.get("from");
  const toParm   = url.searchParams.get("to");
  const mode     = url.searchParams.get("mode"); // "server" or "driver"

  // 4️⃣ Build your Prisma filter
  const where: any = {};

  if (paidParm === "true")  where.paid = true;
  if (paidParm === "false") where.paid = false;

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

  // 5️⃣ Restrict non-admins to their own payouts,
  //    and optionally filter by server/driver mode
  if (!isAdmin) {
    where.userId = userId;

    if (isServer && mode === "server") {
      where.order = { totalDeliveryFee: { equals: 0 } };
    }
    if (isDriver && mode === "driver") {
      where.order = { totalDeliveryFee: { gt: 0 } };
    }
  }

  // 6️⃣ Fetch and return
  const payouts = await prisma.payout.findMany({
    where,
    include: {
      user:  { select: { id: true, firstName: true, lastName: true } },
      order: { select: { orderId: true, totalDeliveryFee: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(payouts);
}
