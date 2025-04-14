import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  // Extract the category query parameter if provided.
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    let items;
    if (category) {
      // Fetch up to 10 menu items for the given category (excluding items that might already be in the cart)
      items = await prisma.menuItem.findMany({
        where: { categoryId: category },
        take: 10,
        orderBy: { id: "desc" }
      });
    } else {
      // If no category provided, return 10 latest menu items as default recommendations
      items = await prisma.menuItem.findMany({
        take: 10,
        orderBy: { id: "desc" }
      });
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
