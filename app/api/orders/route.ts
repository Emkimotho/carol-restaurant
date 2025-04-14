// File: app/api/orders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/orders
 * Retrieves a list of orders with optional filtering by status, date, or assigned staff.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // e.g., a comma-separated list of statuses
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const assignedStaffId = searchParams.get("assignedStaffId");

    console.log("GET /api/orders - Filters:", {
      status,
      dateFrom,
      dateTo,
      assignedStaffId,
    });

    // Build the query object based on provided filters.
    const query: any = {};
    if (status) {
      // Allow multiple statuses separated by commas.
      const statuses = status.split(",");
      query.status = { in: statuses };
    }
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.gte = new Date(dateFrom);
      if (dateTo) query.createdAt.lte = new Date(dateTo);
    }
    if (assignedStaffId) {
      query.assignedStaffId = assignedStaffId;
    }

    // Fetch orders that match query, sorted by newest first.
    const orders = await prisma.order.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
    });

    console.log(`GET /api/orders - Retrieved ${orders.length} orders.`);
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error in GET /api/orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders." }, { status: 500 });
  }
}

/**
 * POST /api/orders
 * Creates a new order record.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("POST /api/orders - Request body:", body);

    // Generate a human-friendly order ID.
    function generateOrderId(): string {
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `ORD-${datePart}-${randomPart}`;
    }

    // Create the order record.
    const newOrder = await prisma.order.create({
      data: {
        orderId: generateOrderId(),
        customerId: body.customerId || null,
        items: body.items, // Expecting a valid JSON object/array.
        totalAmount: body.totalAmount,
        status: "ORDER_RECEIVED", // Set the initial status.
      },
    });

    console.log("POST /api/orders - New order created:", newOrder);

    // Log the initial status in OrderStatusHistory.
    await prisma.orderStatusHistory.create({
      data: {
        orderId: newOrder.id,
        status: newOrder.status,
        changedBy: body.customerId || "system", // Log who initiated the order.
      },
    });

    console.log("POST /api/orders - Order status history logged.");
    return NextResponse.json(newOrder, { status: 201 });
  } catch (error) {
    console.error("Error creating order in POST /api/orders:", error);
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }
}
