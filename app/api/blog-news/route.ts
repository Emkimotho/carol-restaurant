import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/blog-news?type=blog|news
 * If no "type", returns all.
 */
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const validTypes = ["blog", "news"];

  try {
    let whereClause = {};
    if (type && validTypes.includes(type)) {
      whereClause = { type };
    }

    const posts = await prisma.blogNews.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        author: true,
        date: true,
        type: true,
        image: true,
      },
    });

    return NextResponse.json(posts, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching blog-news list:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/blog-news
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const title = formData.get("title") as string;
    const excerpt = formData.get("excerpt") as string;
    const content = formData.get("content") as string;
    const author = formData.get("author") as string;
    const date = formData.get("date") as string;
    const type = formData.get("type") as string;

    // Generate a slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    let imageName: string | undefined;
    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.name) {
      imageName = imageFile.name;
    }

    const newPost = await prisma.blogNews.create({
      data: {
        title,
        excerpt,
        content,
        author,
        date: new Date(date),
        type,
        slug,
        image: imageName || null,
      },
    });

    return NextResponse.json(newPost, { status: 201 });
  } catch (error: any) {
    console.error("Error creating new post:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
