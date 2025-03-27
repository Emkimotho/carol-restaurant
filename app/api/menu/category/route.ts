// File: app/api/menu/category/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const categories = await prisma.menuCategory.findMany({
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, type, order } = await request.json();

    if (!name || !type) {
      return NextResponse.json({ message: "Name and type are required." }, { status: 400 });
    }

    const category = await prisma.menuCategory.create({
      data: {
        name,
        type,
        order: order || 0,
      },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
