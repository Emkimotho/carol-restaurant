// File: app/api/tickets/redeem/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCode } from "@/lib/ticketCodeUtils";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

/**
 * POST /api/tickets/redeem
 * Body: { code: string }
 *
 * Authenticates the staff user via JWT, looks up a ticket by its code,
 * ensures it's still "ISSUED", updates it to "REDEEMED" with redeemedAt
 * and redeemedById, then returns purchaser, event, redeemedAt, and
 * redeemedBy (staff name).
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Parse & normalize code
    const body = await req.json();
    const rawCode = body?.code;
    if (!rawCode || typeof rawCode !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid ticket code" },
        { status: 400 }
      );
    }
    const code = normalizeCode(rawCode);

    // 2. Authenticate via NextAuth JWT
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET!,
    });
    if (!token?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    // 3. Authorize role: only certain roles may redeem
    const roles: string[] = Array.isArray(token.roles)
      ? token.roles.map((r) => String(r).toUpperCase())
      : [];
    const allowedRoles = ["SUPERADMIN", "ADMIN", "STAFF", "CASHIER"];
    const hasRole = roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const staffId = Number(token.id);
    if (Number.isNaN(staffId)) {
      console.warn("Token id is not a number:", token.id);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 4. Atomically update only if status is exactly "ISSUED"
    const now = new Date();
    const updateResult = await prisma.ticket.updateMany({
      where: { code, status: "ISSUED" },
      data: {
        status: "REDEEMED",
        redeemedAt: now,
        redeemedById: staffId,
      },
    });

    if (updateResult.count === 0) {
      // Either ticket not found, or not in "ISSUED" state
      return NextResponse.json(
        { message: "Ticket not found or already redeemed/cancelled" },
        { status: 404 }
      );
    }

    // 5. Fetch updated ticket + event data
    const updated = await prisma.ticket.findUnique({
      where: { code },
      select: {
        purchaser:      true,
        purchaserEmail: true,
        redeemedAt:     true,
        redeemedById:   true,
        event: {
          select: {
            title:     true,
            date:      true,
            startTime: true,
            location:  true,
          },
        },
      },
    });
    if (!updated) {
      // Should not normally happen since we just updated
      console.error("Ticket was updated but cannot be found afterwards:", code);
      return NextResponse.json(
        { message: "Ticket redeemed but lookup failed" },
        { status: 500 }
      );
    }

    // 6. Lookup staff user’s name for redeemedBy
    let redeemedBy: string | null = null;
    if (updated.redeemedById) {
      const staffUser = await prisma.user.findUnique({
        where: { id: updated.redeemedById },
        select: { firstName: true, lastName: true },
      });
      if (staffUser) {
        redeemedBy = `${staffUser.firstName} ${staffUser.lastName}`;
      }
    }

    // 7. Return the info
    return NextResponse.json(
      {
        purchaser:      updated.purchaser,
        purchaserEmail: updated.purchaserEmail,
        event:          updated.event,
        redeemedAt:     updated.redeemedAt,
        redeemedBy,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error redeeming ticket:", error);
    return NextResponse.json(
      { message: "Server error: " + (error.message ?? String(error)) },
      { status: 500 }
    );
  }
}
