// File: app/api/events/[eventId]/booking/route.ts
// POST /api/events/:eventId/booking — create a pending booking and return Stripe Checkout session URL

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Use the Stripe API version matching your installed Stripe package/types.
  // If your types expect "2025-05-28.basil", use that; otherwise adjust accordingly.
  apiVersion: "2025-05-28.basil",
});

interface BookingData {
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
  totalPrice: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = (await request.json()) as BookingData;

    // Validate input fields
    if (
      !eventId ||
      typeof body.name !== "string" ||
      body.name.trim() === "" ||
      typeof body.email !== "string" ||
      body.email.trim() === "" ||
      typeof body.adultCount !== "number" ||
      body.adultCount < 0 ||
      typeof body.kidCount !== "number" ||
      body.kidCount < 0 ||
      body.adultCount + body.kidCount <= 0 ||
      typeof body.totalPrice !== "number" ||
      body.totalPrice <= 0
    ) {
      return NextResponse.json(
        { message: "Missing or invalid booking fields" },
        { status: 400 }
      );
    }

    // 1. Create a pending Booking record in the database
    const booking = await prisma.booking.create({
      data: {
        eventId,
        name:       body.name.trim(),
        email:      body.email.trim(),
        adultCount: body.adultCount,
        kidCount:   body.kidCount,
        totalPrice: body.totalPrice,
      },
    });

    // Ensure FRONTEND URL env var is set
    const frontend = process.env.NEXT_PUBLIC_FRONTEND_URL;
    if (!frontend) {
      console.error("NEXT_PUBLIC_FRONTEND_URL is not defined");
      // Delete the pending booking if desired, or leave pending for manual cleanup
      return NextResponse.json(
        { message: "Server configuration error" },
        { status: 500 }
      );
    }

    // 2. Create a Stripe Checkout session
    // Build success & cancel URLs
    // Use a descriptive thank-you route, e.g. "/events/thank-you"
    const successUrl = `${frontend}/events/thank-you?bookingId=${booking.id}`;
    const cancelUrl  = `${frontend}/events/${eventId}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name:        `Event Tickets (${eventId})`,
              description: `${body.adultCount} adult ticket(s), ${body.kidCount} kid ticket(s)`,
            },
            unit_amount: Math.round(body.totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode:        "payment",
      success_url: successUrl,
      cancel_url:  cancelUrl,
      metadata: {
        bookingId: booking.id,
      },
    });

    // 3. Return session URL so client can redirect user to Stripe Checkout
    return NextResponse.json(
      { sessionUrl: session.url },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in booking route:", error);
    return NextResponse.json(
      { message: "Server error: " + (error?.message ?? String(error)) },
      { status: 500 }
    );
  }
}
