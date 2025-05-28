import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const caterings = await prisma.catering.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: caterings });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, date, time, venue, guests, message } = body;

    if (!fullName || !email || !phone || !date || !time || !venue || !guests) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const dateObj = new Date(date);

    const newCatering = await prisma.catering.create({
      data: {
        fullName,
        email,
        phone,
        date: dateObj,
        time,
        venue,
        guests: Number(guests),
        message: message || "",
      },
    });

    return NextResponse.json({ success: true, data: newCatering });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
