import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface BookingData {
  eventId: string;
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
  totalPrice: number;
}

export async function POST(request: Request) {
  try {
    const body: BookingData = await request.json();

    if (!body.eventId || !body.name || !body.email || body.adultCount <= 0) {
      return NextResponse.json(
        { message: "Missing or invalid booking fields" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        eventId: body.eventId,
        name: body.name,
        email: body.email,
        adultCount: body.adultCount,
        kidCount: body.kidCount,
        totalPrice: body.totalPrice,
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
