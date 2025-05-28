// DELETE /api/events/rsvps/:id — remove a single RSVP
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    await prisma.rSVP.delete({ where: { id } });
    return NextResponse.json({ message: "RSVP deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting RSVP:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
