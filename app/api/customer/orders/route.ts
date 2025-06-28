// File: app/api/customer/orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }         from "next-auth/next";
import { authOptions }              from "@/lib/auth";
import prisma                       from "@/lib/prisma";
import { OrderStatus }              from "@prisma/client";

export async function GET(request: NextRequest) {
  // 1) Authenticate the user
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Lookup the user record to get customerId
  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const customerId = user.id;

  // 3) Read & validate the 'which' query parameter (active|past)
  const url    = new URL(request.url);
  const which  = url.searchParams.get("which");
  if (!which || !["active", "past"].includes(which)) {
    return NextResponse.json(
      { error: "Missing or invalid 'which' query (use active or past)" },
      { status: 400 }
    );
  }

  // 4) Build status filter
  let statusFilter:
    | { in: OrderStatus[] }
    | { notIn: OrderStatus[] };

  if (which === "active") {
    // anything not yet delivered or cancelled
    statusFilter = { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] };
  } else {
    // only delivered or cancelled
    statusFilter = { in: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] };
  }

  // 5) Fetch orders including a preview of line items
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      status: statusFilter,
    },
    include: {
      lineItems: {
        select: {
          quantity: true,
          menuItem: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 6) Format and return
  const formatted = orders.map((o) => ({
    id:      o.id,
    orderId: o.orderId,
    date:    o.createdAt.toISOString().split("T")[0],
    total:   o.totalAmount,
    items: o.lineItems.map((li) => ({
      title:    li.menuItem.title,
      quantity: li.quantity,
    })),
  }));

  return NextResponse.json({ orders: formatted });
}
