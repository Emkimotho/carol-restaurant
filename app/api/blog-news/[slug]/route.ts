// File: app/api/blog-news/[slug]/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

// disable built-in body parser so we can handle multipart/form-data
export const config = {
  api: { bodyParser: false },
};

// configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET /api/blog-news/[slug]?type=...
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? undefined;

  try {
    const selectFields = {
      id:                true,
      title:             true,
      slug:              true,
      excerpt:           true,
      content:           true,
      author:            true,
      date:              true,
      type:              true,
      blogImagePublicId: true,
      imageUrl:          true,
      legacyImage:       true,
    };

    const post = type
      ? await prisma.blogNews.findFirst({
          where:  { slug, type },
          select: selectFields,
        })
      : await prisma.blogNews.findUnique({
          where:  { slug },
          select: selectFields,
        });

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(post);
  } catch (err: any) {
    console.error("GET /api/blog-news/[slug] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/blog-news/[slug]
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const form = await request.formData();
    const titleRaw   = form.get("title");
    const excerptRaw = form.get("excerpt");
    const contentRaw = form.get("content");
    const authorRaw  = form.get("author");
    const dateRaw    = form.get("date");
    const typeRaw    = form.get("type");
    const legacyRaw  = form.get("legacyImage");

    if (
      typeof titleRaw   !== "string" ||
      typeof excerptRaw !== "string" ||
      typeof contentRaw !== "string" ||
      typeof authorRaw  !== "string" ||
      typeof dateRaw    !== "string" ||
      typeof typeRaw    !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const title       = titleRaw.trim();
    const excerpt     = excerptRaw.trim();
    const content     = contentRaw.trim();
    const author      = authorRaw.trim();
    const date        = new Date(dateRaw.trim());
    const type        = typeRaw.trim() as "blog" | "news";
    let legacyImage   =
      typeof legacyRaw === "string" ? legacyRaw.trim() : null;

    // handle optional image upload
    const fileField = form.get("image");
    let blogImagePublicId: string | null = null;
    let imageUrl:           string | null = null;

    if (fileField instanceof Blob && fileField.size > 0) {
      // destroy old Cloudinary asset if exists
      const existing = await prisma.blogNews.findUnique({ where: { slug } });
      if (existing?.blogImagePublicId) {
        await cloudinary.uploader.destroy(existing.blogImagePublicId, {
          resource_type: "image",
        });
      }
      legacyImage = null;

      const arrayBuffer = await fileField.arrayBuffer();
      const buffer      = Buffer.from(arrayBuffer);
      const dataUri     = `data:${fileField.type};base64,${buffer.toString(
        "base64"
      )}`;

      const uploadRes = await cloudinary.uploader.upload(dataUri, {
        folder:        "blog-news",
        resource_type: "image",
        public_id:     slug,
        overwrite:     true,
      });

      blogImagePublicId = uploadRes.public_id;
      imageUrl          = uploadRes.secure_url;
    }

    const updateData: any = {
      title,
      excerpt,
      content,
      author,
      date,
      type,
    };

    if (blogImagePublicId) {
      updateData.blogImagePublicId = blogImagePublicId;
      updateData.imageUrl          = imageUrl;
      updateData.legacyImage       = null;
    } else if (legacyImage) {
      updateData.legacyImage = legacyImage;
    }

    const updated = await prisma.blogNews.update({
      where: { slug },
      data:  updateData,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT /api/blog-news/[slug] error:", err);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/blog-news/[slug]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const existing = await prisma.blogNews.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    if (existing.blogImagePublicId) {
      await cloudinary.uploader.destroy(existing.blogImagePublicId, {
        resource_type: "image",
      });
    }

    const deleted = await prisma.blogNews.delete({ where: { slug } });
    return NextResponse.json(deleted, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/blog-news/[slug] error:", err);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
