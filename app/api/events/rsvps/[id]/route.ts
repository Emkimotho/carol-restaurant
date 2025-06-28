import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Await params in case Next.js provides it as a promise
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Missing RSVP id" }, { status: 400 });
    }
    // Optionally: check existence first
    const existing = await prisma.rSVP.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: "RSVP not found" }, { status: 404 });
    }
    await prisma.rSVP.delete({ where: { id } });
    return NextResponse.json({ message: "RSVP deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting RSVP:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
