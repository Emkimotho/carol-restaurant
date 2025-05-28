// File: app/api/customer/dashboard/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { OrderStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  // 1) Ensure authenticated
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Load user record
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      streetAddress: true,
      aptSuite: true,
      city: true,
      state: true,
      zip: true,
      country: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 3) Define which statuses count as “pending”
  const pendingStatuses = [
    OrderStatus.ORDER_RECEIVED,
    OrderStatus.IN_PROGRESS,
    OrderStatus.ORDER_READY,
  ];

  // 4) Fetch pending orders (not delivered or cancelled)
  const pending = await prisma.order.findMany({
    where: {
      customerId: user.id,
      status: { in: pendingStatuses },
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 5) Fetch past orders (delivered or cancelled)
  const past = await prisma.order.findMany({
    where: {
      customerId: user.id,
      NOT: { status: { in: pendingStatuses } },
    },
    select: {
      id: true,
      createdAt: true,
      totalAmount: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 6) Return the payload
  return NextResponse.json({
    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      streetAddress: user.streetAddress,
      aptSuite: user.aptSuite,
      city: user.city,
      state: user.state,
      zip: user.zip,
      country: user.country,
    },
    pendingOrders: pending.map((o) => ({
      id: o.id,
      date: o.createdAt.toISOString().split("T")[0],
      total: o.totalAmount,
    })),
    pastOrders: past.map((o) => ({
      id: o.id,
      date: o.createdAt.toISOString().split("T")[0],
      total: o.totalAmount,
    })),
  });
}
