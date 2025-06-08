// File: app/api/banner-images/route.ts

import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
  const slides = await prisma.bannerImage.findMany({
    orderBy: { position: "asc" },
    select: {
      id:       true,
      type:     true,
      imageUrl: true,
      videoUrl: true,
      alt:      true,
    },
  });
  return NextResponse.json(slides);
}
