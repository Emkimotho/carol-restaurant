// File: app/api/menu/category/route.ts
// ------------------------------------------------------------------
// • GET  /api/menu/category   → list categories
// • POST /api/menu/category   → create category (handles `hidden` and Clover sync)
// ------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
// Update the import path if the file is located elsewhere, for example:
import { cloverFetch, getCloverConfig } from "../../../../lib/cloverClient";
// Or create the file at src/lib/clover/cloverClient.ts if it does not exist.

const { merchantId } = getCloverConfig();

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

    // 1. Create category in Clover, capture its ID
    let cloverCategoryId: string | null = null;
    try {
      const response = await cloverFetch<{ id: string }>(
        `/v3/merchants/${merchantId}/categories`,
        {
          method: "POST",
          body: JSON.stringify({ name }),
        }
      );
      cloverCategoryId = response.id;
    } catch (e: any) {
      console.error("Failed to create category in Clover:", e);
      return NextResponse.json(
        { message: "Could not create category in Clover: " + e.message },
        { status: 500 }
      );
    }

    // 2. Create local category with cloverCategoryId
    const category = await prisma.menuCategory.create({
      data: {
        name,
        type,
        order:  order ?? 0,
        hidden: hidden ?? false,
        cloverCategoryId,
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
