// GET /api/events/rsvps — list all RSVPs with event title
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rsvps = await prisma.rSVP.findMany({
      orderBy: { createdAt: "desc" },
      include: { event: { select: { title: true } } },
    });

    const transformed = rsvps.map((r) => ({
      id:         r.id,
      eventId:    r.eventId,
      eventTitle: r.event.title,
      name:       r.name,
      email:      r.email,
      adultCount: r.adultCount,
      kidCount:   r.kidCount,
      createdAt:  r.createdAt.toISOString(),
    }));

    return NextResponse.json({ rsvps: transformed }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching RSVPs:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
