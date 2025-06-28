// File: app/api/admin/finances/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OrderStatus, DeliveryType } from "@prisma/client";
import { ET, toJS } from "@/lib/time";

type Period = "day" | "week" | "month" | "year";
type ETDate = ReturnType<typeof ET>;
type Range = { start: ETDate; end: ETDate };

/** Build an Eastern-time range */
const rangeFor = (p: Period): Range => {
  const now = ET();
  switch (p) {
    case "week":
      return { start: now.startOf("day").minus({ days: 6 }), end: now };
    case "month":
      return { start: now.startOf("day").minus({ months: 1 }), end: now };
    case "year":
      return { start: now.startOf("day").minus({ years: 1 }), end: now };
    default:
      return { start: now.startOf("day"), end: now };
  }
};

/** Case-insensitive admin check */
const isAdmin = (s: any) =>
  Array.isArray(s?.user?.roles) &&
  s.user.roles.some((r: string) => r.toLowerCase() === "admin");

export async function GET(req: NextRequest) {
  // 1 · Auth
  const sess = await getServerSession(authOptions);
  if (!sess?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(sess)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2 · Pick range
  const qs = req.nextUrl.searchParams;
  let range: Range;
  if (qs.has("from") && qs.has("to")) {
    // parse dates in ET, then endOf day on "to"
    const startET = ET(qs.get("from")!);
    const endET = ET(qs.get("to")!).endOf("day");
    range = { start: startET, end: endET };
  } else {
    const period = (qs.get("period") as Period) ?? "day";
    range = rangeFor(period);
  }

  // 3 · Delivered-order filter (use deliveredAt)
  const deliveredFilter = {
    deliveredAt: { gte: toJS(range.start), lte: toJS(range.end) },
    status: OrderStatus.DELIVERED,
  };

  // 4 · Aggregates
  // A: sum over all delivered
  const aggAll = await prisma.order.aggregate({
    where: deliveredFilter,
    _sum: {
      subtotal: true,
      taxAmount: true,
      tipAmount: true,
      customerDeliveryFee: true,
      restaurantDeliveryFee: true,
      // note: driverPayout field in DB might be stored or might be computed; we recompute ourselves below
    },
  });
  const sumAll = aggAll._sum;

  // B: sum over delivered **delivery** orders → driver payout components
  const aggDelivery = await prisma.order.aggregate({
    where: {
      ...deliveredFilter,
      deliveryType: DeliveryType.DELIVERY,
    },
    _sum: {
      tipAmount: true,
      customerDeliveryFee: true,
      restaurantDeliveryFee: true,
    },
  });
  const sumDelivery = aggDelivery._sum;
  // total driver payout aggregate:
  const totalDriverPayout =
    (sumDelivery.tipAmount ?? 0)
    + (sumDelivery.customerDeliveryFee ?? 0)
    + (sumDelivery.restaurantDeliveryFee ?? 0);

  // C: sum over delivered **non-delivery** orders → server payout components
  const aggNonDelivery = await prisma.order.aggregate({
    where: {
      ...deliveredFilter,
      NOT: { deliveryType: DeliveryType.DELIVERY },
    },
    _sum: {
      tipAmount: true,
    },
  });
  const sumNonDelivery = aggNonDelivery._sum;
  const totalServerPayout = (sumNonDelivery.tipAmount ?? 0);

  // 5 · Optional rows
  let orders: any[] = [];
  if (qs.get("orders") === "true") {
    // select the raw fields we need, including deliveryType & tipAmount etc
    const raws = await prisma.order.findMany({
      where: deliveredFilter,
      select: {
        orderId: true,
        createdAt: true,
        updatedAt: true,
        deliveredAt: true,
        subtotal: true,
        taxAmount: true,
        tipAmount: true,
        customerDeliveryFee: true,
        restaurantDeliveryFee: true,
        deliveryType: true,
        // you may select other fields if needed, e.g. staffId, etc.
      },
      orderBy: { deliveredAt: "desc" },
    });
    // map each row to include computed driverPayout / serverPayout
    orders = raws.map((r) => {
      const tip = r.tipAmount ?? 0;
      const custDel = r.customerDeliveryFee ?? 0;
      const restSub = r.restaurantDeliveryFee ?? 0;
      let driverPayout = 0;
      let serverPayout = 0;
      if (r.deliveryType === DeliveryType.DELIVERY) {
        driverPayout = tip + custDel + restSub;
      } else {
        serverPayout = tip;
      }
      return {
        orderId: r.orderId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        deliveredAt: r.deliveredAt,
        subtotal: r.subtotal,
        taxAmount: r.taxAmount,
        tipAmount: tip,
        customerDeliveryFee: custDel,
        restaurantDeliveryFee: restSub,
        deliveryType: r.deliveryType,
        driverPayout,
        serverPayout,
      };
    });
  }

  // 6 · Response
  return NextResponse.json({
    range: { from: range.start.toISO(), to: range.end.toISO() },
    totals: {
      subtotal: sumAll.subtotal ?? 0,
      taxAmount: sumAll.taxAmount ?? 0,
      tipAmount: sumAll.tipAmount ?? 0,
      customerDeliveryFee: sumAll.customerDeliveryFee ?? 0,
      restaurantDeliveryFee: sumAll.restaurantDeliveryFee ?? 0,
      driverPayout: totalDriverPayout,
      serverPayout: totalServerPayout,
    },
    orders,
  });
}
