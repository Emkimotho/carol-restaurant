import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/blog-news/[slug]?type=...
 */
export async function GET(
  request: NextRequest,
  context: { params: { slug: string } }
) {
  const { slug } = context.params; // access slug here
  const type = request.nextUrl.searchParams.get("type");

  // if type is provided, filter by { slug, type }, else just { slug }
  const whereClause = type ? { slug, type } : { slug };

  try {
    const post = await prisma.blogNews.findUnique({
      where: whereClause,
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json(post, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching post by slug:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/blog-news/[slug]
 */
export async function PUT(
  request: NextRequest,
  context: { params: { slug: string } }
) {
  const { slug } = context.params;

  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const excerpt = formData.get("excerpt") as string;
    const content = formData.get("content") as string;
    const author = formData.get("author") as string;
    const date = formData.get("date") as string;
    const type = formData.get("type") as string;

    let imageFile = formData.get("image") as File | null;
    let imageName: string | undefined = undefined;
    if (imageFile && imageFile.name) {
      imageName = imageFile.name; // or handle real file uploads here
    }

    const updatedPost = await prisma.blogNews.update({
      where: { slug },
      data: {
        title,
        excerpt,
        content,
        author,
        date: new Date(date),
        type,
        ...(imageName ? { image: imageName } : {}),
      },
    });

    return NextResponse.json(updatedPost, { status: 200 });
  } catch (error: any) {
    console.error("Error updating post:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/blog-news/[slug]
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { slug: string } }
) {
  const { slug } = context.params;

  try {
    await prisma.blogNews.delete({
      where: { slug },
    });
    return NextResponse.json({ message: "Post deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
