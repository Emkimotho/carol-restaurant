// File: app/api/payouts/[id]/route.ts
// Description: Handles marking a payout as paid; only admins allowed.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }         from "next-auth/next";
import { authOptions }              from "@/lib/auth";
import prisma                       from "@/lib/prisma";     // ← default import

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthenticated" },
        { status: 401 }
      );
    }

    // 2. Authorization: only ADMIN role (case-insensitive)
    const rawRoles = (session.user as any).roles;
    const roles: string[] = Array.isArray(rawRoles) ? rawRoles : [];
    if (!roles.some(r => r.toLowerCase() === "admin")) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // 3. Validate payout ID
    const payoutId = Number(params.id);
    if (isNaN(payoutId)) {
      return NextResponse.json(
        { error: "Invalid payout ID" },
        { status: 400 }
      );
    }

    // 4. Update payout record
    const updated = await prisma.payout.update({
      where: { id: payoutId },
      data: {
        paid:   true,
        paidAt: new Date(),
      },
      include: {
        user:  { select: { id: true, firstName: true, lastName: true } },
        order: { select: { orderId: true } },
      },
    });

    // 5. Return updated record
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PATCH /api/payouts/:id] Error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
