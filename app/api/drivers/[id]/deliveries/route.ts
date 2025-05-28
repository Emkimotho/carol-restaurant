// File: app/api/drivers/[id]/deliveries/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const driverId = Number(id);

  const deliveries = await prisma.order.findMany({
    where: { driverId },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ deliveries });
}
