// File: app/api/dashboard/sales/trend/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  // last 30 days
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);

  // fetch orders in range
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true, totalAmount: true },
  });

  // group by day
  const data: { date: string; sales: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateKey = d.toISOString().split("T")[0];
    const sales = orders
      .filter(o => o.createdAt.toISOString().startsWith(dateKey))
      .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
    data.push({ date: dateKey, sales });
  }

  return NextResponse.json(data);
}
