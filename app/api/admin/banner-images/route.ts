// File: app/api/admin/banner-images/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient }            from "@prisma/client";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Readable }                from "stream";

const prisma = new PrismaClient();

// ────────────────────────────────────────────────────────────────────
// Allow larger request bodies (e.g., video uploads up to 50 MB)
// ────────────────────────────────────────────────────────────────────
export const config = {
  api: {
    bodyParser: { sizeLimit: "50mb" }
  }
};

// ────────────────────────────────────────────────────────────────────
// Configure Cloudinary from environment variables in .env.local:
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// ────────────────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/**
 * Helper: convert a Readable stream into a Buffer
 */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/* ───────────────────────────── GET /api/admin/banner-images ──────────────── */
export async function GET() {
  // Return all slides (id, type, imageUrl, videoUrl, alt, position), ordered by position
  const slides = await prisma.bannerImage.findMany({
    orderBy: { position: "asc" },
    select:  {
      id:       true,
      type:     true,
      imageUrl: true,
      videoUrl: true,
      alt:      true,
      position: true,
    },
  });
  return NextResponse.json(slides);
}

/* ───────────────────────────── POST /api/admin/banner-images ─────────────── */
export async function POST(req: NextRequest) {
  /**
   * Expect a multipart/form-data body containing:
   * - field "file" → the File blob (image or video)
   * - field "alt"  → string alt text
   */
  const formData  = await req.formData();
  const fileField = formData.get("file") as File | null;
  const altField  = formData.get("alt")  as string | null;

  if (!fileField || !altField) {
    return NextResponse.json(
      { error: "Missing 'file' or 'alt' in form data." },
      { status: 400 }
    );
  }

  // Determine if the uploaded file is a video
  const isVideo = fileField.type.startsWith("video/");

  // ── Only count existing IMAGE slides, not videos ───────────────────
  const existingImageCount = await prisma.bannerImage.count({
    where: { type: "IMAGE" },
  });
  if (!isVideo && existingImageCount >= 3) {
    return NextResponse.json(
      { error: "Cannot add more than 3 image slides." },
      { status: 400 }
    );
  }
  // ──────────────────────────────────────────────────────────────────

  // Read the incoming File into a Buffer
  const buffer = await streamToBuffer(fileField.stream() as unknown as Readable);

  // Upload Buffer to Cloudinary under folder "banner_images"
  const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder:        "banner_images",
        resource_type: isVideo ? "video" : "image",
        public_id:     `banner_${Date.now()}`,
        format:        undefined, // preserve original extension
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve(result);
      }
    );
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
  });

  // Compute next position = (max position in table) + 1
  const maxPositionAgg = await prisma.bannerImage.aggregate({
    _max: { position: true },
  });
  const nextPosition = (maxPositionAgg._max.position ?? 0) + 1;

  // Create the BannerImage row, storing secure_url as imageUrl or videoUrl
  const newSlide = await prisma.bannerImage.create({
    data: {
      type:     isVideo ? "VIDEO" : "IMAGE",
      imageUrl: isVideo ? null : uploadResult.secure_url,
      videoUrl: isVideo ? uploadResult.secure_url : null,
      alt:      altField,
      position: nextPosition,
    },
  });

  return NextResponse.json(newSlide, { status: 201 });
}
