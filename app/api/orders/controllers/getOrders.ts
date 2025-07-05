// File: app/api/orders/controllers/getOrders.ts
// ------------------------------------------------------------------
//  Order list  (GET)
//
//  Supports driver, server, cashier, admin & staff dashboards.
//  Always returns { orders, page, totalPages }.
//
//  🔄 2025-06-27 update
//  ───────────────────
//  • DRIVER role now sees…
//        a) every ORDER_RECEIVED that is **unclaimed** (driverId IS NULL)
//        b) every load already assigned to them
//        c) follow-up statuses they control
//          (IN_PROGRESS, ORDER_READY, PICKED_UP_BY_DRIVER, ON_THE_WAY)
//      Delivered history unchanged (via ?status=delivered).
//  • Filtering keys on orderType === 'delivery' (instead of fee > 0).
//  • ⚠️ The previous “isOnline” check has been **removed** – if a driver
//    fires this request, they get the list regardless of the flag.
//  • No other role behaviour changed.
// ------------------------------------------------------------------

import { NextResponse }   from "next/server";
import { prisma }         from "@/lib/prisma";
import {
  Prisma,
  OrderStatus,
  PaymentMethod,
  CashCollectionStatus,
}                         from "@prisma/client";

/* =================================================================== */
/*  Main handler                                                       */
/* =================================================================== */
export async function getOrders(req: Request) {
  const { searchParams } = new URL(req.url);

  /* ---------- common query-params ---------- */
  const role               = searchParams.get("role");       // driver|server|cashier|admin|staff
  const driverIdRaw        = searchParams.get("driverId");
  const statusParam        = searchParams.get("status");
  const paymentMethodParam = searchParams.get("paymentMethod");
  const reconciledParam    = searchParams.get("reconciled"); // cashier
  const serverIdParam      = searchParams.get("serverId");   // cashier filter
  const q                  = searchParams.get("q") ?? "";    // admin/staff search
  const staffIdParam       = searchParams.get("staffId");    // staff filter

  /* ---------- pagination (admin/staff only) ---------- */
  const page  = Number(searchParams.get("page")  ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const skip  = (page - 1) * limit;

  /* helper to wrap arrays into paginated response */
  const wrap = <T>(arr: T[]) => ({
    orders:     arr,
    page,
    totalPages: arr.length === 0 ? 1 : Math.ceil(arr.length / limit),
  });

  /* ================================================================= */
  /*  DRIVER dashboard                                                 */
  /* ================================================================= */
  if (role === "driver" && driverIdRaw) {
    const driverId = Number(driverIdRaw);
    // delivered-history tab
    if (statusParam === "delivered") {
      const delivered = await prisma.order.findMany({
        where: {
          driverId,
          status:     OrderStatus.DELIVERED,
          orderType:  "delivery",
        },
        orderBy: { deliveredAt: "desc" },
        include: baseIncludes(),
      });
      return NextResponse.json(wrap(delivered));
    }

    // active queue – now with built-in schedule filter
    const activeStatuses: OrderStatus[] = [
      OrderStatus.ORDER_RECEIVED,
      OrderStatus.IN_PROGRESS,
      OrderStatus.ORDER_READY,
      OrderStatus.PICKED_UP_BY_DRIVER,
      OrderStatus.ON_THE_WAY,
    ];

    const active = await prisma.order.findMany({
      where: {
        orderType: "delivery",
        status:    { in: activeStatuses },

        // unclaimed or mine...
        AND: [
          {
            OR: [
              { driverId: null },
              { driverId },
            ],
          },
          // ...AND either no schedule (ASAP) or schedule ≤ now
          {
            OR: [
              { schedule: null },
              { schedule: { lte: new Date() } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: baseIncludes(),
    });

    return NextResponse.json(wrap(active));
  }

  /* ================================================================= */
  /*  SERVER dashboard                                                 */
  /* ================================================================= */
  if (role === "server") {
    const statuses = statusParam && (OrderStatus as any)[statusParam]
      ? [(OrderStatus as any)[statusParam] as OrderStatus]
      : [OrderStatus.ORDER_READY];

    const where: Prisma.OrderWhereInput = { status: { in: statuses } };
    if (paymentMethodParam) {
      where.paymentMethod = paymentMethodParam as PaymentMethod;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        ...baseIncludes(),
        cashCollection: {
          include: {
            server:    { select: { firstName: true, lastName: true } },
            settledBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return NextResponse.json(wrap(orders));
  }

  /* ================================================================= */
  /*  CASHIER dashboard                                                */
  /* ================================================================= */
  if (role === "cashier") {
    const cashStatus = reconciledParam === "true"
      ? CashCollectionStatus.SETTLED
      : CashCollectionStatus.PENDING;

    const cashFilter: Prisma.CashCollectionWhereInput = { status: cashStatus };
    if (serverIdParam) cashFilter.serverId = Number(serverIdParam);

    const orders = await prisma.order.findMany({
      where: {
        paymentMethod:  PaymentMethod.CASH,
        cashCollection: cashFilter,
      },
      orderBy: { createdAt: "desc" },
      include: {
        ...baseIncludes(),
        cashCollection: {
          include: {
            server:    { select: { firstName: true, lastName: true } },
            settledBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return NextResponse.json(wrap(orders));
  }

  /* ================================================================= */
  /*  ADMIN / STAFF list + search + pagination                         */
  /* ================================================================= */
  let where: Prisma.OrderWhereInput = {};
  if (q.trim()) {
    where = {
      OR: [
        { orderId:    { contains: q, mode: "insensitive" } },
        { guestName:  { contains: q, mode: "insensitive" } },
        { guestEmail: { contains: q, mode: "insensitive" } },
        {
          customer: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName:  { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ],
    };
  }
  if (staffIdParam) where.staffId = Number(staffIdParam);

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take:  limit,
      orderBy: { createdAt: "desc" },
      include: baseIncludes(),
    }),
  ]);

  return NextResponse.json({
    orders,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

/* =================================================================== */
/*  Shared include block                                               */
/* =================================================================== */
function baseIncludes(): Prisma.OrderInclude {
  return {
    customer: { select: { firstName: true, lastName: true } },
    driver:   { select: { id: true, firstName: true, lastName: true } },
    staff:    { select: { firstName: true, lastName: true } },
    lineItems: { include: { menuItem: true } },
    statusHistory: {
      orderBy: { timestamp: "asc" },
      select: {
        status:    true,
        timestamp: true,
        changedBy: true,
        user:      { select: { firstName: true, lastName: true } },
      },
    },
  };
}
