// File: app/api/dashboard/events/count/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const count = await prisma.event.count();
  return NextResponse.json({ count });
}
