// File: app/api/payouts/paid/route.ts
// Description: Bulk‐delete (or archive) all paid payouts, scoped by date range and (for non-admins) by user.

import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request) {
  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // 2. Extract user ID & roles
  const rawId = (session.user as any).id ?? (session.user as any).sub;
  const userId = typeof rawId === "string" ? parseInt(rawId, 10) : Number(rawId);
  const roles = Array.isArray((session.user as any).roles)
    ? (session.user as any).roles
    : [];
  const isAdmin = roles.includes("ADMIN");

  // 3. Parse optional query params
  const url      = new URL(req.url);
  const fromParm = url.searchParams.get("from");
  const toParm   = url.searchParams.get("to");

  // 4. Build Prisma filter
  const where: any = { paid: true };

  // Date range
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
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }
  }

  // Non-admins: restrict to their own payouts
  if (!isAdmin) {
    where.userId = userId;
  }

  // 5. Delete records
  const result = await prisma.payout.deleteMany({ where });

  // 6. Respond with count deleted
  return NextResponse.json({ deleted: result.count });
}
