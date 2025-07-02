// File: app/api/careers/applications/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma }                  from "@/lib/prisma";
import { v2 as cloudinary }        from "cloudinary";

export const config = { api: { bodyParser: false } };

// Configure Cloudinary from your env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    // 1) Look up the application & its Cloudinary public ID
    const existing = await prisma.application.findUnique({
      where: { id },
      select: { id: true, resumePublicId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Application not found" },
        { status: 404 }
      );
    }

    // 2) Delete the DB record
    const deleted = await prisma.application.delete({
      where: { id },
    });

    // 3) Remove from Cloudinary (best-effort)
    if (existing.resumePublicId) {
      cloudinary.uploader
        .destroy(existing.resumePublicId)
        .catch((err) =>
          console.error(
            "Cloudinary deletion error for application",
            existing.resumePublicId,
            err
          )
        );
    }

    // 4) Return the deleted record
    return NextResponse.json({ application: deleted }, { status: 200 });
  } catch (error: any) {
    console.error("[DELETE /applications/[id]] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
