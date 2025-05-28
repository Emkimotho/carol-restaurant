// File: app/api/orders/controllers/getOrders.ts
// ------------------------------------------------------------------
//  Order list  (GET)
//  Supports role-based filtering for driver, server, cashier, admin/staff
//  Always returns { orders, page, totalPages } shape
// ------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import {
  Prisma,
  OrderStatus,
  PaymentMethod,
  CashCollectionStatus,
}                        from "@prisma/client";

export async function getOrders(req: Request) {
  const { searchParams }   = new URL(req.url);
  const role               = searchParams.get("role");
  const driverIdRaw        = searchParams.get("driverId");
  const statusParam        = searchParams.get("status");
  const paymentMethodParam = searchParams.get("paymentMethod");
  const reconciledParam    = searchParams.get("reconciled");

  // Admin/staff pagination parameters
  const page  = Number(searchParams.get("page")  ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const skip  = (page - 1) * limit;

  // Helper to wrap arrays into paginated response
  const wrap = <T>(arr: T[]) => ({
    orders:     arr,
    page,
    totalPages: arr.length === 0 ? 1 : Math.ceil(arr.length / limit),
  });

  /* ---- Driver view ---- */
  if (role === "driver" && driverIdRaw) {
    const driverId = Number(driverIdRaw);

    // Delivered orders
    if (statusParam === "delivered") {
      const delivered = await prisma.order.findMany({
        where: { driverId, status: OrderStatus.DELIVERED },
        orderBy: { deliveredAt: "desc" },
        include: {
          customer:      { select: { firstName: true, lastName: true } },
          driver:        { select: { firstName: true, lastName: true } },
          staff:         { select: { firstName: true, lastName: true } },
          lineItems:     { include: { menuItem: true } },
          statusHistory: {
            orderBy: { timestamp: "asc" },
            select: {
              status:    true,
              timestamp: true,
              changedBy: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
      return NextResponse.json(wrap(delivered));
    }

    // Active / available orders
    const active = await prisma.order.findMany({
      where: {
        status: { notIn: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED] },
        AND: [
          {
            OR: [
              { orderType: "delivery" },
              { totalDeliveryFee: { gt: 0 } },
              { driverPayout:       { gt: 0 } },
            ],
          },
          { OR: [{ driverId: null }, { driverId }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        customer:      { select: { firstName: true, lastName: true } },
        driver:        { select: { firstName: true, lastName: true } },
        staff:         { select: { firstName: true, lastName: true } },
        lineItems:     { include: { menuItem: true } },
        statusHistory: {
          orderBy: { timestamp: "asc" },
          select: {
            status:    true,
            timestamp: true,
            changedBy: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return NextResponse.json(wrap(active));
  }

  /* ---- Server view ---- */
  if (role === "server") {
    const statuses = statusParam && (OrderStatus as any)[statusParam]
      ? [ (OrderStatus as any)[statusParam] as OrderStatus ]
      : [ OrderStatus.ORDER_READY ];

    const where: Prisma.OrderWhereInput = { status: { in: statuses } };
    if (paymentMethodParam) {
      where.paymentMethod = paymentMethodParam as PaymentMethod;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        customer:      { select: { firstName: true, lastName: true } },
        driver:        { select: { firstName: true, lastName: true } },
        staff:         { select: { firstName: true, lastName: true } },
        lineItems:     { include: { menuItem: true } },
        statusHistory: {
          orderBy: { timestamp: "asc" },
          select: {
            status:    true,
            timestamp: true,
            changedBy: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        cashCollection: true,
      },
    });
    return NextResponse.json(wrap(orders));
  }

  /* ---- Cashier view ---- */
  if (role === "cashier") {
    const isSettled = reconciledParam === "true";
    const cashStatus = isSettled
      ? CashCollectionStatus.SETTLED
      : CashCollectionStatus.PENDING;

    const orders = await prisma.order.findMany({
      where: {
        paymentMethod: PaymentMethod.CASH,
        cashCollection: { status: cashStatus },
      },
      orderBy: { createdAt: "desc" },
      include: {
        cashCollection: true,
        customer:       { select: { firstName: true, lastName: true } },
        driver:         { select: { firstName: true, lastName: true } },
        staff:          { select: { firstName: true, lastName: true } },
        lineItems:      { include: { menuItem: true } },
        statusHistory:  {
          orderBy: { timestamp: "asc" },
          select: {
            status:    true,
            timestamp: true,
            changedBy: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    return NextResponse.json(wrap(orders));
  }

  /* ---- Admin / Staff list + search + pagination ---- */
  const q = searchParams.get("q") ?? "";
  let where: Prisma.OrderWhereInput = {};

  if (q) {
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

  const [ total, orders ] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer:      { select: { firstName: true, lastName: true } },
        driver:        { select: { firstName: true, lastName: true } },
        staff:         { select: { firstName: true, lastName: true } },
        lineItems:     { include: { menuItem: true } },
        statusHistory: {
          orderBy: { timestamp: "asc" },
          select: {
            status:    true,
            timestamp: true,
            changedBy: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    orders,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  });
}
