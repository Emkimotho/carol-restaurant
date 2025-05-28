// File: app/api/events/[eventId]/rsvp/route.ts
// POST /api/events/:eventId/rsvp — create an RSVP for a specific event
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RsvpData {
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body: RsvpData = await request.json();

    if (
      !eventId ||
      !body.name ||
      !body.email ||
      typeof body.adultCount !== "number" ||
      body.adultCount <= 0
    ) {
      return NextResponse.json(
        { message: "Missing or invalid RSVP fields" },
        { status: 400 }
      );
    }

    const rsvp = await prisma.rSVP.create({
      data: {
        eventId,
        name:       body.name,
        email:      body.email,
        adultCount: body.adultCount,
        kidCount:   body.kidCount,
      },
    });

    return NextResponse.json({ rsvp }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating RSVP:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
