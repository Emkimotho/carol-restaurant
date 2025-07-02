// File: app/api/registeruser/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";

// configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Next.js 15+: params is async
type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (isNaN(id)) {
    return NextResponse.json({ message: "Invalid user ID" }, { status: 400 });
  }

  try {
    // 1. Fetch any related profiles to delete their Cloudinary images
    const [staff, driver] = await Promise.all([
      prisma.staffProfile.findUnique({ where: { userId: id } }),
      prisma.driverProfile.findUnique({ where: { userId: id } }),
    ]);

    // 2. Destroy Cloudinary images if present
    if (staff?.photoPublicId) {
      await cloudinary.uploader.destroy(staff.photoPublicId);
    }
    if (driver?.photoPublicId) {
      await cloudinary.uploader.destroy(driver.photoPublicId);
    }

    // 3. Delete the user (cascades to profiles & roles)
    const deleted = await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: `User ${deleted.email} (ID ${id}) deleted` },
      { status: 200 }
    );

  } catch (err: any) {
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
