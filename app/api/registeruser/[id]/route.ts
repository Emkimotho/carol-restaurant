// File: app/api/registeruser/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

// Configure Cloudinary from your .env
cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:     process.env.CLOUDINARY_API_KEY!,
  api_secret:  process.env.CLOUDINARY_API_SECRET!,
});

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /api/registeruser/[id]
 * • Deletes Cloudinary images from any staff/driver profiles
 * • Deletes the user (cascades to profiles & roles)
 */
export async function DELETE(
  _req: NextRequest,
  { params }: Ctx
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  try {
    // 1) Load any existing profiles to get their public IDs
    const [staff, driver] = await Promise.all([
      prisma.staffProfile.findUnique({ where: { userId: id } }),
      prisma.driverProfile.findUnique({ where: { userId: id } }),
    ]);

    // 2) Remove Cloudinary assets if present
    if (staff?.photoPublicId) {
      await cloudinary.uploader.destroy(staff.photoPublicId, { resource_type: "image" });
    }
    if (driver?.photoPublicId) {
      await cloudinary.uploader.destroy(driver.photoPublicId, { resource_type: "image" });
    }

    // 3) Delete the user (cascades to profiles & roles)
    const deleted = await prisma.user.delete({ where: { id } });

    return NextResponse.json(
      { message: `User ${deleted.email} (ID ${id}) deleted` },
      { status: 200 }
    );
  } catch (err: any) {
    // Handle “not found”
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { message: `No user found with ID ${id}` },
        { status: 404 }
      );
    }
    console.error("DELETE /api/registeruser/[id] error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
