// File: app/api/tickets/lookup/[code]/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCode } from "@/lib/ticketCodeUtils";

export const runtime = "nodejs";

/**
 * GET /api/tickets/lookup/:code
 *
 * Lookup a ticket by its code (normalized), returning purchaser & event details
 * and current status, so staff can confirm before redeeming.
 *
 * Returns `redeemedBy` as a string (staff name) or null.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: rawCode } = await params;
    if (!rawCode || typeof rawCode !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid ticket code in URL" },
        { status: 400 }
      );
    }
    const code = normalizeCode(rawCode);

    const ticket = await prisma.ticket.findUnique({
      where: { code },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            startTime: true,
            location: true,
          },
        },
        redeemedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ message: "Ticket not found" }, { status: 404 });
    }

    // Build redeemedBy as string or null
    const redeemedByName = ticket.redeemedBy
      ? `${ticket.redeemedBy.firstName} ${ticket.redeemedBy.lastName}`
      : null;

    // Build response payload
    const responseData = {
      code: ticket.code,
      status: ticket.status, // e.g. "ISSUED" or "REDEEMED"
      purchaser: ticket.purchaser,
      purchaserEmail: ticket.purchaserEmail,
      event: {
        id: ticket.event.id,
        title: ticket.event.title,
        date: ticket.event.date,       // ISO string
        startTime: ticket.event.startTime,
        location: ticket.event.location,
      },
      redeemedAt: ticket.redeemedAt,    // may be null
      redeemedBy: redeemedByName,       // string or null
    };

    console.log(`[lookup] code=${code} status=${ticket.status}`);

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error("Error looking up ticket:", error);
    return NextResponse.json(
      { message: "Server error: " + (error.message ?? String(error)) },
      { status: 500 }
    );
  }
}
