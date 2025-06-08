// File: app/api/admin/banner-images/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient }            from "@prisma/client";

const prisma = new PrismaClient();

/* ───────────────────────────────────────────────────────────────
   PUT /api/admin/banner-images/[id]
   Updates only the provided fields (alt and/or position)
──────────────────────────────────────────────────────────────── */
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // Await params before using
  const { id } = await context.params;
  const { alt, position } = (await request.json()) as {
    alt?: string;
    position?: number;
  };

  const dataToUpdate: Record<string, any> = {};
  if (typeof alt === "string")      dataToUpdate.alt = alt;
  if (typeof position === "number") dataToUpdate.position = position;

  const updated = await prisma.bannerImage.update({
    where: { id },
    data:  dataToUpdate,
  });

  return NextResponse.json(updated);
}

/* ───────────────────────────────────────────────────────────────
   DELETE /api/admin/banner-images/[id]
   Removes the slide with the given id.
   Respond with 204 No Content (no body).
──────────────────────────────────────────────────────────────── */
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // Await params before using
  const { id } = await context.params;
  await prisma.bannerImage.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
