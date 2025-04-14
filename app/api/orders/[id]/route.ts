// File: app/api/orders/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET handler for a single order. It awaits the dynamic parameters before using them.
export async function GET(
  req: Request,
  context: { params: { id: string } }
) {
  // Await the params object before destructuring.
  const { id } = await Promise.resolve(context.params);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      statusHistory: {
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json(order);
}

// PATCH handler to update an order's status and (optionally) assigned staff.
// It also logs the change in the OrderStatusHistory model.
export async function PATCH(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    // Await the params before using them.
    const { id } = await Promise.resolve(context.params);
    const body = await req.json();
    const { status, assignedStaffId, changedBy } = body;

    if (!status || !changedBy) {
      return NextResponse.json(
        { error: "Missing required fields: status or changedBy." },
        { status: 400 }
      );
    }

    // Update the order using the provided status (and optionally, assignedStaffId).
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(assignedStaffId && { assignedStaffId }),
      },
    });

    // Log the status update in the OrderStatusHistory table.
    await prisma.orderStatusHistory.create({
      data: {
        orderId: updatedOrder.id,
        status,
        changedBy,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order." },
      { status: 500 }
    );
  }
}
