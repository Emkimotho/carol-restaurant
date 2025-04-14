import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: reservations });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, phone, date, time, guests, message } = body;

    if (!fullName || !email || !phone || !date || !time || !guests) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const dateObj = new Date(date);

    const newReservation = await prisma.reservation.create({
      data: {
        fullName,
        email,
        phone,
        date: dateObj,
        time,
        guests: Number(guests),
        message: message || "",
      },
    });

    return NextResponse.json({ success: true, data: newReservation });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
