// File: app/api/events/bookings/route.ts
// GET /api/events/bookings — list every booking (newest first) with event title
// ⚠️  Make sure this file is placed exactly as shown:  app/api/events/bookings/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: { event: { select: { title: true } } },
    });

    const transformed = bookings.map((b) => ({
      id:         b.id,
      eventId:    b.eventId,
      eventTitle: b.event.title,
      name:       b.name,
      email:      b.email,
      adultCount: b.adultCount,
      kidCount:   b.kidCount,
      totalPrice: b.totalPrice,
      createdAt:  b.createdAt.toISOString(),
    }));

    return NextResponse.json({ bookings: transformed }, { status: 200 });
  } catch (error: any) {
    console.error("Error in GET /api/events/bookings:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}