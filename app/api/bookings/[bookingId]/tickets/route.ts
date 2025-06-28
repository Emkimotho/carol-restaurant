// File: app/api/bookings/[bookingId]/tickets/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/bookings/[bookingId]/tickets?email=...
 *
 * Query param:
 *   email (string) – purchaser email, must match booking.email (case-insensitive)
 *
 * Path param:
 *   bookingId – the booking record to look up
 *
 * Returns:
 *   200 { tickets: Array<{ code: string; status: string; redeemedAt: string | null; event: { title, date, startTime, location } }> }
 *   400/403/404 on errors
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // Await params before destructuring
    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json(
        { message: "Missing bookingId" },
        { status: 400 }
      );
    }

    // Parse email from query string
    const url = req.nextUrl;
    const emailParam = url.searchParams.get("email");
    if (!emailParam || typeof emailParam !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid email query parameter" },
        { status: 400 }
      );
    }
    const email = emailParam.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { message: "Invalid email" },
        { status: 400 }
      );
    }

    // Lookup booking and ensure email matches
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { email: true, eventId: true },
    });
    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }
    if (booking.email.trim().toLowerCase() !== email) {
      return NextResponse.json(
        { message: "Email does not match booking" },
        { status: 403 }
      );
    }

    // Fetch tickets for this booking, include event info
    const tickets = await prisma.ticket.findMany({
      where: {
        bookingId: bookingId,
        purchaserEmail: booking.email.trim(),
      },
      select: {
        code: true,
        status: true,
        redeemedAt: true,
        event: {
          select: {
            title: true,
            date: true,
            startTime: true,
            location: true,
          },
        },
      },
    });

    // Return array (may be empty if tickets not yet issued)
    return NextResponse.json(
      {
        tickets: tickets.map((t) => ({
          code: t.code,
          status: t.status,
          redeemedAt: t.redeemedAt ? t.redeemedAt.toISOString() : null,
          event: t.event,
        })),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in GET /api/bookings/[bookingId]/tickets:", error);
    return NextResponse.json(
      { message: "Server error: " + (error.message ?? String(error)) },
      { status: 500 }
    );
  }
}
