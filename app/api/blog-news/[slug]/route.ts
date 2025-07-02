// File: app/api/blog-news/[slug]/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

export const config = {
  api: {
    bodyParser: false,
  },
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
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const type = request.nextUrl.searchParams.get("type") ?? undefined;

  try {
    const post = type
      ? await prisma.blogNews.findFirst({
          where: { slug, type },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            content: true,
            author: true,
            date: true,
            type: true,
            blogImagePublicId: true,
            imageUrl: true,
          },
        })
      : await prisma.blogNews.findUnique({
          where: { slug },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            content: true,
            author: true,
            date: true,
            type: true,
            blogImagePublicId: true,
            imageUrl: true,
          },
        });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (err: any) {
    console.error("GET /api/blog-news/[slug] error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

/**
 * PUT /api/blog-news/[slug]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    const formData = await request.formData();
    const title   = (formData.get("title")   as string).trim();
    const excerpt = (formData.get("excerpt") as string).trim();
    const content = (formData.get("content") as string).trim();
    const author  = (formData.get("author")  as string).trim();
    const dateStr = (formData.get("date")    as string).trim();
    const type    = (formData.get("type")    as string).trim();

    if (!title || !excerpt || !content || !author || !dateStr || !type) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // prepare Cloudinary fields
    let blogImagePublicId: string | null = null;
    let imageUrl: string | null         = null;

    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.size > 0) {
      // destroy old asset if it exists
      const existing = await prisma.blogNews.findUnique({ where: { slug } });
      if (existing?.blogImagePublicId) {
        await cloudinary.uploader.destroy(existing.blogImagePublicId);
      }

      // upload new to Cloudinary
      const buf     = Buffer.from(await imageFile.arrayBuffer());
      const dataUri = `data:${imageFile.type};base64,${buf.toString("base64")}`;
      const uploadRes = await cloudinary.uploader.upload(dataUri, {
        folder:    "blog-news",
        public_id: slug,
        overwrite: true,
      });

      blogImagePublicId = uploadRes.public_id;
      imageUrl          = uploadRes.secure_url;
    }

    const updated = await prisma.blogNews.update({
      where: { slug },
      data: {
        title,
        excerpt,
        content,
        author,
        date: new Date(dateStr),
        type,
        ...(blogImagePublicId != null && {
          blogImagePublicId,
          imageUrl,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PUT /api/blog-news/[slug] error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/blog-news/[slug]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    // fetch to get publicId
    const existing = await prisma.blogNews.findUnique({ where: { slug } });
    if (!existing) {
      return NextResponse.json(
        { message: "Post not found" },
        { status: 404 }
      );
    }

    // delete from Cloudinary if present
    if (existing.blogImagePublicId) {
      await cloudinary.uploader.destroy(existing.blogImagePublicId);
    }

    // delete record
    await prisma.blogNews.delete({ where: { slug } });
    return NextResponse.json(
      { message: "Post deleted successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("DELETE /api/blog-news/[slug] error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
