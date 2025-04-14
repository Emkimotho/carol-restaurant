import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/menu/category/order
 * Expects a JSON payload: { order: string[] }
 * Updates each category's order field according to its position.
 */
export async function PUT(request: Request) {
  try {
    const { order } = await request.json();
    if (!order || !Array.isArray(order)) {
      return NextResponse.json({ message: "Order must be an array." }, { status: 400 });
    }

    // For debugging: log the incoming order array.
    console.log("Received order array:", order);

    // Update each category's order.
    const updates = order.map((catId: string, index: number) =>
      prisma.menuCategory.update({
        where: { id: catId },
        data: { order: index + 1 },
      })
    );

    const results = await Promise.all(updates);
    console.log("Update results:", results);

    return NextResponse.json({ message: "Category order updated." }, { status: 200 });
  } catch (error) {
    console.error("Error updating category order:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
