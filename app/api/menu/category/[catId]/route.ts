/* ------------------------------------------------------------------ */
/*  File: app/api/menu/category/[catId]/route.ts                      */
/* ------------------------------------------------------------------ */
/*  • GET    /api/menu/category/:catId                                */
/*  • PUT    /api/menu/category/:catId                                */
/*  • DELETE /api/menu/category/:catId                                */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";

/* ================================================================== */
/*  GET  /api/menu/category/:catId                                    */
/* ================================================================== */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ catId: string }> },
) {
  const { catId } = await ctx.params;
  try {
    const category = await prisma.menuCategory.findUnique({
      where:   { id: catId },
      include: { menuItems: true },
    });
    if (!category) {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/* ================================================================== */
/*  PUT  /api/menu/category/:catId                                    */
/* ================================================================== */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ catId: string }> },
) {
  const { catId } = await ctx.params;
  try {
    const body       = await req.json();
    const updateData: Record<string, any> = {};

    if (body.name   !== undefined) updateData.name   = String(body.name).trim();
    if (body.type   !== undefined) updateData.type   = String(body.type).trim();
    if (body.order  !== undefined) updateData.order  = Number(body.order) || 0;
    if (body.hidden !== undefined) updateData.hidden = Boolean(body.hidden);

    if (!Object.keys(updateData).length) {
      return NextResponse.json(
        { message: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.menuCategory.update({
      where: { id: catId },
      data:  updateData,
    });
    return NextResponse.json({ category: updated }, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating category ${catId}:`, error);
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/* ================================================================== */
/*  DELETE /api/menu/category/:catId                                  */
/* ================================================================== */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ catId: string }> },
) {
  const { catId } = await ctx.params;
  try {
    await prisma.$transaction([
      prisma.nestedOptionChoice.deleteMany({
        where: {
          nestedGroup: {
            parentChoice: {
              optionGroup: { menuItem: { categoryId: catId } },
            },
          },
        },
      }),
      prisma.nestedOptionGroup.deleteMany({
        where: {
          parentChoice: {
            optionGroup: { menuItem: { categoryId: catId } },
          },
        },
      }),
      prisma.menuOptionChoice.deleteMany({
        where: { optionGroup: { menuItem: { categoryId: catId } } },
      }),
      prisma.menuItemOptionGroup.deleteMany({
        where: { menuItem: { categoryId: catId } },
      }),
      prisma.menuItem.deleteMany({
        where: { categoryId: catId },
      }),
      prisma.menuCategory.delete({
        where: { id: catId },
      }),
    ]);

    return NextResponse.json(
      { message: "Category and related items deleted" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(`Error deleting category ${catId}:`, error);
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
