// File: app/api/orders/[id]/route.ts
/* =======================================================================
   • Handles GET / PATCH / DELETE for both UUID and “ORD-…” slugs
   • GET returns `{ order }` for easy client-side destructuring

   • 2025-06-27 PATCH overhaul ——————————————————————————————
     – Disallows **status rollback** (earlier → HTTP 409)
     – Driver-only calls (`{ driverId }`) update assignment **only**
       (no auto-bump), status stays untouched
     – Staff-only calls (`{ staffId }`) update assignment **only**
       (no auto-bump), status stays untouched
     – All other PATCHes may advance status as allowed, log history,
       trigger side-effects (cash, payouts, Clover)
     – Every change writes an OrderStatusHistory row
   ======================================================================= */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth/next";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import {
  OrderStatus,
  PaymentMethod,
  CashCollectionStatus,
  DeliveryType,
}                                    from "@prisma/client";
import { broadcast }                 from "../live/route";
import { orderPushQueue }            from "@/lib/clover/queues/orderPushQueue";

/* ───────────────────────── Helpers ───────────────────────── */
const isFriendlyId = (slug: string) => slug.startsWith("ORD-");
const resolveInternalId = async (slug: string): Promise<string | null> => {
  if (!isFriendlyId(slug)) return slug;
  const row = await prisma.order.findUnique({
    where:  { orderId: slug },
    select: { id: true },
  });
  return row?.id ?? null;
};
const slugFrom = (req: NextRequest) =>
  new URL(req.url).pathname.split("/").pop()!;

const statusRank: Record<OrderStatus, number> = {
  ORDER_RECEIVED      : 0,
  IN_PROGRESS         : 1,
  ORDER_READY         : 2,
  PICKED_UP_BY_DRIVER : 3,
  ON_THE_WAY          : 4,
  DELIVERED           : 5,
  CANCELLED           : 6,
  PENDING_PAYMENT     : -1,
};

/* ───────────────────────── GET ───────────────────────── */
export async function GET(req: NextRequest) {
  const slug = slugFrom(req);
  const id   = await resolveInternalId(slug);
  if (!id) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer:      { select: { firstName: true, lastName: true, email: true } },
        driver:        { select: { id: true, firstName: true, lastName: true } },
        staff:         { select: { id: true, firstName: true, lastName: true } },
        lineItems:     { include: { menuItem: true } },
        statusHistory: { orderBy: { timestamp: "asc" },
                         include: { user: { select: { firstName: true, lastName: true } } } },
        cashCollection:true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (err: any) {
    console.error(`[GET /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ───────────────────────── PATCH ───────────────────────── */
export async function PATCH(req: NextRequest) {
  const slug    = slugFrom(req);
  const id      = await resolveInternalId(slug);
  if (!id) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const payload = (await req.json()) as Partial<{
    status:   OrderStatus;
    driverId: number | null;
    staffId:  number | null;
  }>;

  // detect driver-only or staff-only assignment
  const isDriverOnly = Object.keys(payload).length === 1 && "driverId" in payload;
  const isStaffOnly  = Object.keys(payload).length === 1 && "staffId"  in payload;

  // identify actor
  const session = await getServerSession(authOptions);
  const actorId = session?.user?.id ? Number(session.user.id) : undefined;

  // build changedBy label
  let changedBy = "System";
  if (session?.user) {
    const u: any = session.user;
    if (u.firstName || u.lastName) {
      changedBy = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    } else {
      changedBy = u.name || u.email || "User";
    }
  }

  const actorExists = actorId
    ? !!(await prisma.user.findUnique({ where: { id: actorId } }))
    : false;

  const logHistory = (newStatus: OrderStatus) =>
    prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status:  newStatus,
        changedBy,
        ...(actorExists ? { userId: actorId! } : {}),
      },
    });

  try {
    // fetch existing
    const existing = await prisma.order.findUnique({
      where: { id },
      select: {
        status:        true,
        driverId:      true,
        staffId:       true,
        paymentMethod: true,
        driverPayout:  true,
        tipAmount:     true,
        deliveryType:  true,
        cloverOrderId: true,
        totalAmount:   true,
      },
    });
    if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // prevent backward status change
    if (payload.status) {
      const oldRank = statusRank[existing.status];
      const newRank = statusRank[payload.status];
      if (newRank < oldRank) {
        return NextResponse.json(
          { error: "Backward status change not allowed" },
          { status: 409 }
        );
      }
    }

    // === driver-only flow ===
    if (isDriverOnly) {
      if (payload.driverId !== existing.driverId) {
        await logHistory(existing.status);
      }
      const updated = await prisma.order.update({
        where: { id },
        data:  { driverId: payload.driverId },
      });
      broadcast({ id, field: "driverId", value: updated.driverId });
      return NextResponse.json(updated);
    }

    // === staff-only flow ===
    if (isStaffOnly) {
      if (payload.staffId !== existing.staffId) {
        await logHistory(existing.status);
      }
      const updated = await prisma.order.update({
        where: { id },
        data:  { staffId: payload.staffId },
      });
      broadcast({ id, field: "staffId", value: updated.staffId });
      return NextResponse.json(updated);
    }

    // === full flow for any other payload ===

    // log driver/staff changes
    if ("driverId" in payload && payload.driverId !== existing.driverId) {
      await logHistory(existing.status);
    }
    if ("staffId"  in payload && payload.staffId  !== existing.staffId ) {
      await logHistory(existing.status);
    }
    // log explicit status change
    if (payload.status && payload.status !== existing.status) {
      await logHistory(payload.status);
    }

    // prepare update
    const updateData: any = { ...payload };
    if (payload.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    // persist
    const updatedOrder = await prisma.order.update({
      where: { id },
      data:  updateData,
    });

    // side-effects on DELIVERED
    if (
      payload.status === OrderStatus.DELIVERED &&
      existing.paymentMethod === PaymentMethod.CASH &&
      actorExists
    ) {
      await prisma.cashCollection.create({
        data: {
          orderId:  id,
          serverId: actorId!,
          amount:   existing.totalAmount,
          status:   CashCollectionStatus.PENDING,
        },
      });
    }
    if (payload.status === OrderStatus.DELIVERED) {
      if (updatedOrder.driverId && existing.driverPayout! > 0) {
        await prisma.payout.create({
          data: {
            userId:   updatedOrder.driverId,
            orderId:  updatedOrder.id,
            amount:   existing.driverPayout!,
            category: "DRIVER_PAYOUT",
          },
        });
      }
      if (
        updatedOrder.staffId &&
        existing.tipAmount! > 0 &&
        existing.deliveryType !== DeliveryType.DELIVERY
      ) {
        await prisma.payout.create({
          data: {
            userId:   updatedOrder.staffId!,
            orderId:  updatedOrder.id,
            amount:   existing.tipAmount!,
            category: "SERVER_TIP",
          },
        });
      }
    }

    // enqueue Clover void on cancel
    if (
      payload.status === OrderStatus.CANCELLED &&
      existing.cloverOrderId
    ) {
      await orderPushQueue.add("void", {
        id,
        orderId: slug,
        force: true,
      });
    }

    // broadcast all changes
    if ("driverId" in payload) {
      broadcast({ id, field: "driverId", value: updatedOrder.driverId });
    }
    if ("staffId"  in payload) {
      broadcast({ id, field: "staffId",  value: updatedOrder.staffId  });
    }
    if (payload.status) {
      broadcast({ id, field: "status", value: updatedOrder.status });
    }

    return NextResponse.json(updatedOrder);
  } catch (err: any) {
    console.error(`[PATCH /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ───────────────────────── DELETE ───────────────────────── */
export async function DELETE(req: NextRequest) {
  const slug = slugFrom(req);
  const id   = await resolveInternalId(slug);
  if (!id) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  try {
    await prisma.cashCollection.deleteMany({ where: { orderId: id } });
    await prisma.payout.deleteMany({         where: { orderId: id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: id } });
    await prisma.orderLineItem.deleteMany({   where: { orderId: id } });
    await prisma.order.delete({ where: { id } });
    broadcast({ id, field: "deleted", value: true });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error(`[DELETE /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
