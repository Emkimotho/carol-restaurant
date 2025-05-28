// File: app/api/admin/finances/route.ts
// Aggregates $ totals for DELIVERED orders — Eastern‑time aware.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }         from "next-auth/next";
import { authOptions }              from "@/lib/auth";
import prisma                       from "@/lib/prisma";
import { OrderStatus }              from "@prisma/client";
import { ET, toJS }                 from "@/lib/time";

type Period = "day" | "week" | "month" | "year";
type ETDate = ReturnType<typeof ET>;
type Range  = { start: ETDate; end: ETDate };

/* Build an Eastern‑time range */
const rangeFor = (p: Period): Range => {
  const now = ET();
  switch (p) {
    case "week":  return { start: now.startOf("day").minus({ days: 6 }), end: now };
    case "month": return { start: now.startOf("day").minus({ months: 1 }), end: now };
    case "year":  return { start: now.startOf("day").minus({ years : 1 }), end: now };
    default:      return { start: now.startOf("day"),                    end: now };
  }
};

const isAdmin = (s: any) =>
  Array.isArray(s?.user?.roles) && s.user.roles.includes("ADMIN");

export async function GET(req: NextRequest) {
  /* 1 · Auth */
  const sess = await getServerSession(authOptions);
  if (!sess?.user)    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin(sess)) return NextResponse.json({ error: "Forbidden"    }, { status: 403 });

  /* 2 · Pick range */
  const qs    = req.nextUrl.searchParams;
  const range = qs.has("from") && qs.has("to")
    ? { start: ET(qs.get("from")!), end: ET(qs.get("to")!).endOf("day") }
    : rangeFor((qs.get("period") as Period) ?? "day");

  /* 3 · Delivered‑order filter (use deliveredAt) */
  const delivered = {
    deliveredAt: { gte: toJS(range.start), lte: toJS(range.end) },
    status:      OrderStatus.DELIVERED,
  };

  /* 4 · Totals */
  const { _sum } = await prisma.order.aggregate({
    where: delivered,
    _sum: {
      subtotal:              true,
      taxAmount:             true,
      tipAmount:             true,
      restaurantDeliveryFee: true,
      customerDeliveryFee:   true,
      totalAmount:           true,
    },
  });

  /* 5 · Optional rows */
  let orders: any[] = [];
  if (qs.get("orders") === "true") {
    orders = await prisma.order.findMany({
      where: delivered,
      select: {
        orderId:               true,
        createdAt:             true,
        updatedAt:             true,
        deliveredAt:           true,          
        subtotal:              true,
        taxAmount:             true,
        tipAmount:             true,
        restaurantDeliveryFee: true,
        customerDeliveryFee:   true,
        totalAmount:           true,
      },
      orderBy: { deliveredAt: "desc" },       // sort by delivered time
    });
  }

  /* 6 · Response */
  return NextResponse.json({
    range:  { from: range.start.toISO(), to: range.end.toISO() },
    totals: _sum,
    orders,
  });
}
