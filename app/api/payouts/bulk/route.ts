// File: app/api/payouts/bulk/route.ts
// Description: Bulk‐mark multiple payouts as paid (ADMIN only).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request) {
  // 1. Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const rawRoles = (session.user as any).roles;
  const roles: string[] = Array.isArray(rawRoles) ? rawRoles : [];
  if (!roles.includes("ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse request body
  let ids: number[];
  try {
    const body = await req.json();
    ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!ids.length) {
    return NextResponse.json({ error: "No payout IDs provided" }, { status: 400 });
  }

  // 3. Bulk update
  const result = await prisma.payout.updateMany({
    where: { id: { in: ids } },
    data: { paid: true, paidAt: new Date() },
  });

  // 4. Return count of updated records
  return NextResponse.json({ updated: result.count });
}
