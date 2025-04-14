// File: app/api/menu/category/[catId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/menu/category/[catId]
 * Fetch a single category by its ID.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ catId: string }> }
) {
  const { catId } = await context.params;
  try {
    const category = await prisma.menuCategory.findUnique({
      where: { id: catId },
    });

    if (!category) {
      console.error(`GET Error: Category not found for id: ${catId}`);
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    console.error("GET Error fetching category with id", catId, ":", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/menu/category/[catId]
 * Update an existing category.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ catId: string }> }
) {
  const { catId } = await context.params;
  try {
    const { name, type, order } = await request.json();
    if (!name || !type) {
      console.error(`PUT Error: Name and type are required for category id: ${catId}`);
      return NextResponse.json({ message: "Name and type are required." }, { status: 400 });
    }

    const updated = await prisma.menuCategory.update({
      where: { id: catId },
      data: {
        name,
        type,
        order: order || 0,
      },
    });

    return NextResponse.json({ category: updated }, { status: 200 });
  } catch (error) {
    console.error("PUT Error updating category with id", catId, ":", JSON.stringify(error));
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/menu/category/[catId]
 * Remove an existing category and its associated menu items.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ catId: string }> }
) {
  const { catId } = await context.params;
  try {
    // Delete all menu items associated with this category
    await prisma.menuItem.deleteMany({
      where: { categoryId: catId },
    });

    // Delete the category itself
    await prisma.menuCategory.delete({
      where: { id: catId },
    });

    return NextResponse.json({ message: "Category and its menu items deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Error deleting category and its items with id", catId, ":", JSON.stringify(error));
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
