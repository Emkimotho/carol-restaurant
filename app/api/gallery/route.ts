// File: app/api/gallery/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Configure Cloudinary from your environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET /api/gallery
 */
export async function GET() {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        alt: true,
        title: true,
        description: true,
        cloudinaryPublicId: true,
        imageUrl: true,
        createdAt: true,
      },
    });
    return NextResponse.json(images);
  } catch (err) {
    console.error("GET /api/gallery error:", err);
    return NextResponse.json(
      { error: "Failed to fetch gallery images" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gallery
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const fileField    = form.get("file");
    const altRaw       = form.get("alt");
    const titleRaw     = form.get("title");
    const descRaw      = form.get("description");

    if (!(fileField instanceof Blob) || !altRaw || !titleRaw || !descRaw) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const alt         = altRaw.toString().trim();
    const title       = titleRaw.toString().trim();
    const description = descRaw.toString().trim();

    // Convert to data URI
    const arrayBuffer = await fileField.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    const dataUri     = `data:${fileField.type};base64,${buffer.toString("base64")}`;

    // Upload
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder:        "gallery",
      resource_type: "image",
    });

    // Persist in DB, including required cloudinaryPublicId
    const image = await prisma.galleryImage.create({
      data: {
        alt,
        title,
        description,
        cloudinaryPublicId: uploadResult.public_id,
        imageUrl:           uploadResult.secure_url,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (err) {
    console.error("POST /api/gallery error:", err);
    return NextResponse.json(
      { error: "Failed to upload gallery image" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gallery?id=#
 */
export async function DELETE(request: Request) {
  try {
    const url     = new URL(request.url);
    const idParam = url.searchParams.get("id");
    if (!idParam) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const id = parseInt(idParam, 10);

    // Find existing record
    const existing = await prisma.galleryImage.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Remove from Cloudinary
    await cloudinary.uploader.destroy(existing.cloudinaryPublicId, {
      resource_type: "image",
    });

    // Delete DB record
    const deleted = await prisma.galleryImage.delete({
      where: { id },
    });
    return NextResponse.json(deleted, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/gallery error:", err);
    return NextResponse.json(
      { error: "Failed to delete gallery image" },
      { status: 500 }
    );
  }
}
