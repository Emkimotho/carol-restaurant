// File: app/api/menupreview/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Configure Cloudinary with your env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET() {
  try {
    const items = await prisma.menuPreviewItem.findMany({
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        displayOrder: true,
        cloudinaryPublicId: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/menupreview error:", err);
    return NextResponse.json(
      { error: "Failed to fetch menu preview items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const fileField = form.get("file");
    const titleRaw = form.get("title");
    const descRaw = form.get("description");
    const orderRaw = form.get("displayOrder");

    if (!(fileField instanceof Blob) || !titleRaw || typeof titleRaw !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const title = titleRaw.trim();
    const description = typeof descRaw === "string" ? descRaw.trim() : null;
    const displayOrder = parseInt(typeof orderRaw === "string" ? orderRaw : "0", 10) || 0;

    // Convert Blob to base64 data URI
    const arrayBuffer = await fileField.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dataUri = `data:${fileField.type};base64,${buffer.toString("base64")}`;

    // Upload to Cloudinary under 'menupreview' folder
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "menupreview",
      public_id: `${Date.now()}`,       // or any nicer naming
      overwrite: true,
    });

    // Persist in database
    const item = await prisma.menuPreviewItem.create({
      data: {
        title,
        description,
        displayOrder,
        cloudinaryPublicId: uploadResult.public_id,
        imageUrl: uploadResult.secure_url,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("POST /api/menupreview error:", err);
    return NextResponse.json(
      { error: "Failed to upload menu preview item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");
    if (!idParam) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Find the record so we know which Cloudinary asset to remove
    const existing = await prisma.menuPreviewItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Delete from Cloudinary if we have a publicId
    if (existing.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(existing.cloudinaryPublicId);
    }

    // Remove from database
    const deleted = await prisma.menuPreviewItem.delete({ where: { id } });
    return NextResponse.json(deleted);
  } catch (err) {
    console.error("DELETE /api/menupreview error:", err);
    return NextResponse.json(
      { error: "Failed to delete menu preview item" },
      { status: 500 }
    );
  }
}
