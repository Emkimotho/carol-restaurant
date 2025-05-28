// DELETE /api/events/bookings/:id — remove a single booking
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;
    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ message: "Booking deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting booking:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
