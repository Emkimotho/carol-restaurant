/* ------------------------------------------------------------------ */
/*  File: app/api/menu/category/route.ts                               */
/* ------------------------------------------------------------------ */
/*  • GET  /api/menu/category   → list categories                      */
/*  • POST /api/menu/category   → create category (handles `hidden`)   */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";

/* ================================================================== */
/*  GET  /api/menu/category                                           */
/* ================================================================== */
export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/* ================================================================== */
/*  POST /api/menu/category                                           */
/* ================================================================== */
export async function POST(request: Request) {
  try {
    const { name, type, order, hidden } = await request.json();

    if (!name || !type) {
      return NextResponse.json(
        { message: "Name and type are required." },
        { status: 400 },
      );
    }

    const category = await prisma.menuCategory.create({
      data: {
        name,
        type,
        order:   order   ?? 0,
        hidden:  hidden  ?? false,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
