import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Missing booking id" }, { status: 400 });
    }
    // Check if booking exists
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "Booking not found" }, { status: 404 });
    }
    // If you have related tickets, you may need to delete them first or rely on cascade rules.
    // For example, if tickets should be deleted when booking is deleted:
    // await prisma.ticket.deleteMany({ where: { bookingId: id } });
    // Then delete booking:
    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ message: "Booking deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting booking:", error);
    // If deletion fails due to foreign key constraints, you may catch and return a helpful message
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
