// File: app/api/bookings/[bookingId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bookings/[bookingId]
 * 
 * Returns the booking details along with event info.
 * 
 * Response 200:
 * {
 *   booking: {
 *     id: string,
 *     event: {
 *       id: string,
 *       title: string,
 *       description?: string,
 *       location: string,
 *       date: string,
 *       startTime: string,
 *       endTime?: string,
 *       adultPrice?: number,
 *       kidPrice?: number,
 *       isFree?: boolean,
 *       adultOnly?: boolean
 *     },
 *     name: string,
 *     email: string,
 *     adultCount: number,
 *     kidCount: number,
 *     totalPrice?: number,
 *     status?: string,
 *     createdAt: string,
 *     updatedAt?: string
 *   }
 * }
 * 
 * 400 if bookingId missing/invalid, 404 if not found, 500 on server error.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // Await params in case Next.js provides as a promise
    const { bookingId } = await params;
    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid bookingId in URL" },
        { status: 400 }
      );
    }

    // Fetch booking including event details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            date: true,
            startTime: true,
            endTime: true,
            adultPrice: true,
            kidPrice: true,
            isFree: true,
            adultOnly: true,
            // you can include more fields if desired
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    // Build response payload
    const responseData = {
      booking: {
        id: booking.id,
        event: {
          id: booking.event.id,
          title: booking.event.title,
          description: booking.event.description,
          location: booking.event.location,
          date: booking.event.date.toISOString(),
          startTime: booking.event.startTime,
          endTime: booking.event.endTime ?? undefined,
          adultPrice: booking.event.adultPrice,
          kidPrice: booking.event.kidPrice,
          isFree: booking.event.isFree,
          adultOnly: booking.event.adultOnly,
        },
        name: booking.name,
        email: booking.email,
        adultCount: booking.adultCount,
        kidCount: booking.kidCount,
        totalPrice: booking.totalPrice,
        // If you added a status field (e.g. "PENDING_PAYMENT", "CONFIRMED"), include it:
        // status: booking.status,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt?.toISOString(),
      },
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error("Error in GET /api/bookings/[bookingId]:", error);
    return NextResponse.json(
      { message: "Server error: " + (error.message ?? String(error)) },
      { status: 500 }
    );
  }
}
