// File: app/api/blog-news/route.ts

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
 * GET /api/blog-news?type=blog|news
 * If no "type", returns all.
 */
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? undefined;
  const validTypes = ["blog", "news"];

  try {
    const where = type && validTypes.includes(type)
      ? { type }
      : {};

    const posts = await prisma.blogNews.findMany({
      where,
      orderBy: { date: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        author: true,
        date: true,
        type: true,
        blogImagePublicId: true,
        imageUrl: true,
      },
    });

    return NextResponse.json(posts);
  } catch (err: any) {
    console.error("GET /api/blog-news error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

/**
 * POST /api/blog-news
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // required fields
    const title   = (formData.get("title")   as string).trim();
    const excerpt = (formData.get("excerpt") as string).trim();
    const content = (formData.get("content") as string).trim();
    const author  = (formData.get("author")  as string).trim();
    const dateStr = (formData.get("date")    as string).trim();
    const type    = (formData.get("type")    as string).trim();

    if (!title || !excerpt || !content || !author || !dateStr || !type) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // slugify title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    // handle optional image upload
    let blogImagePublicId: string | null = null;
    let imageUrl: string | null = null;

    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.size > 0) {
      // read as data URI
      const buf = Buffer.from(await imageFile.arrayBuffer());
      const dataUri = `data:${imageFile.type};base64,${buf.toString("base64")}`;

      const uploadRes = await cloudinary.uploader.upload(dataUri, {
        folder: "blog-news",
        public_id: slug,
        overwrite: true,
      });

      blogImagePublicId = uploadRes.public_id;
      imageUrl            = uploadRes.secure_url;
    }

    const post = await prisma.blogNews.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        author,
        date: new Date(dateStr),
        type,
        blogImagePublicId,
        imageUrl,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/blog-news error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
