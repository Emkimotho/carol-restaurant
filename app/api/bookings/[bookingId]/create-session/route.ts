// File: app/api/bookings/[bookingId]/create-session/route.ts
import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil", // or your desired API version
});

interface BookingRecord {
  id: string;
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
  status?: string; // adjust type if using enum in TS
  event: {
    id: string;
    title: string;
    adultPrice: number;
    kidPrice: number;
    isFree: boolean;
    adultOnly: boolean;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // 1. Extract and validate bookingId
    const { bookingId } = await params;
    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { message: "Missing or invalid bookingId in URL" },
        { status: 400 }
      );
    }

    // 2. Fetch booking from DB, include event details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            adultPrice: true,
            kidPrice: true,
            isFree: true,
            adultOnly: true,
          },
        },
      },
    }) as BookingRecord | null;
    if (!booking) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }

    // 3. Ensure booking is pending payment
    // Adjust this check to match your schema's enum values:
    if ("status" in booking && booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { message: "Booking is not in a state to create a session" },
        { status: 400 }
      );
    }

    // 4. Ensure event is not free
    if (booking.event.isFree) {
      return NextResponse.json(
        { message: "Event is free; no payment needed" },
        { status: 400 }
      );
    }

    // 5. Build line items: adult tickets and optionally kid tickets
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const currency = "usd"; // adjust or fetch from config/env if needed

    // Adult tickets
    if (booking.adultCount > 0) {
      const unitAmount = Math.round(booking.event.adultPrice * 100);
      line_items.push({
        price_data: {
          currency,
          product_data: {
            name: `${booking.event.title} — Adult Ticket`,
          },
          unit_amount: unitAmount,
        },
        quantity: booking.adultCount,
      });
    }

    // Kid tickets (only if event not adultOnly and booking.kidCount > 0)
    if (!booking.event.adultOnly && booking.kidCount > 0) {
      const unitAmountKid = Math.round(booking.event.kidPrice * 100);
      line_items.push({
        price_data: {
          currency,
          product_data: {
            name: `${booking.event.title} — Kid Ticket`,
          },
          unit_amount: unitAmountKid,
        },
        quantity: booking.kidCount,
      });
    }

    if (line_items.length === 0) {
      return NextResponse.json(
        { message: "No tickets to purchase" },
        { status: 400 }
      );
    }

    // 6. Determine success and cancel URLs using request origin
    const origin = new URL(request.url).origin;
    const successUrl = `${origin}/events/thank-you?bookingId=${bookingId}`;
    // You might have a summary or booking page to return to if the user cancels
    const cancelUrl = `${origin}/events/summary/${bookingId}`; // adjust if needed

    // 7. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      // Prefill customer email so receipts go there and Dashboard shows it
      customer_email: booking.email,
      metadata: {
        bookingId,
        customerName: booking.name, // include name in metadata for your webhook/logs
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // 8. Optionally update booking status to something like "SESSION_CREATED"
    // but usually keep as PENDING_PAYMENT until webhook confirms.
    // Uncomment if you wish:
    // await prisma.booking.update({
    //   where: { id: bookingId },
    //   data: { status: "PENDING_PAYMENT" }, // or another interim status
    // });

    // 9. Return the session URL
    return NextResponse.json({ sessionUrl: session.url }, { status: 200 });
  } catch (error: any) {
    console.error("Error in create-session:", error);
    return NextResponse.json(
      { message: "Server error: " + (error.message ?? String(error)) },
      { status: 500 }
    );
  }
}
