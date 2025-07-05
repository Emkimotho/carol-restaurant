// File: app/api/dashboard/feedback/count/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const [contactCount, cateringCount, reservationCount] = await prisma.$transaction([
    prisma.contact.count(),
    prisma.catering.count(),
    prisma.reservation.count(),
  ]);

  return NextResponse.json({
    count: contactCount + cateringCount + reservationCount,
  });
}
