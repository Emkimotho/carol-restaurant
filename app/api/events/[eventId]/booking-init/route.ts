// File: app/api/events/[eventId]/booking-init/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface InitBookingRequest {
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
}

function isValidEmail(email: string): boolean {
  // Simple regex for basic validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // 1. Extract path param
    const { eventId } = await params;
    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { message: "Missing eventId in URL" },
        { status: 400 }
      );
    }

    // 2. Parse JSON body
    let body: InitBookingRequest;
    try {
      body = (await request.json()) as InitBookingRequest;
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { name, email, adultCount, kidCount } = body;

    // 3. Validate fields
    if (
      typeof name !== "string" ||
      name.trim() === "" ||
      typeof email !== "string" ||
      email.trim() === "" ||
      !isValidEmail(email.trim()) ||
      typeof adultCount !== "number" ||
      adultCount < 0 ||
      typeof kidCount !== "number" ||
      kidCount < 0 ||
      adultCount + kidCount <= 0
    ) {
      return NextResponse.json(
        { message: "Missing or invalid booking fields" },
        { status: 400 }
      );
    }
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 4. Fetch event to ensure it exists and allows paid booking
    const eventRecord = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        location: true,
        adultPrice: true,
        kidPrice: true,
        isFree: true,
        adultOnly: true,
        availableTickets: true,
      },
    });
    if (!eventRecord) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }
    if (eventRecord.isFree) {
      return NextResponse.json(
        { message: "This event is free; no booking-init allowed" },
        { status: 400 }
      );
    }
    if (eventRecord.adultOnly && kidCount > 0) {
      return NextResponse.json(
        { message: "This event is adults-only; cannot book child tickets" },
        { status: 400 }
      );
    }

    // 5. Check availability if you track availableTickets
    const totalRequested = adultCount + kidCount;
    if (typeof eventRecord.availableTickets === "number") {
      if (eventRecord.availableTickets < totalRequested) {
        return NextResponse.json(
          { message: "Not enough tickets available" },
          { status: 400 }
        );
      }
    }

    // 6. Compute total price
    const totalPrice =
      adultCount * eventRecord.adultPrice + kidCount * eventRecord.kidPrice;

    // 7. Create Booking with status PENDING_PAYMENT
    const booking = await prisma.booking.create({
      data: {
        eventId,
        name: cleanName,
        email: cleanEmail,
        adultCount,
        kidCount,
        totalPrice,
        // status defaults to PENDING_PAYMENT (per schema)
      },
    });

    // Note: we do NOT decrement availableTickets here automatically.
    // You may choose to reserve tickets only after payment succeeds in your webhook.
    // If you prefer to decrement here to reserve seats, you can update event.availableTickets now:
    //   await prisma.event.update({
    //     where: { id: eventId },
    //     data: { availableTickets: eventRecord.availableTickets - totalRequested },
    //   });

    // 8. Return bookingId and totalPrice
    return NextResponse.json(
      {
        bookingId: booking.id,
        totalPrice,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in booking-init:", error);
    return NextResponse.json(
      { message: "Server error: " + (error.message ?? String(error)) },
      { status: 500 }
    );
  }
}
