// File: app/api/orders/[id]/route.ts
/* =======================================================================
   19th-Hole • Unified Order CRUD API (UUID + “ORD-…” slugs)
   =======================================================================
   ‣ Path:   /api/orders/[id]
   ‣ Verbs:  GET · PATCH · DELETE
   ‣ Features:
       • Accepts both internal UUIDs *and* friendly “ORD-…” slugs
       • GET    → returns full order document (all scalars + relations)
       • PATCH  → status workflow, history, side-effects
       • DELETE → admin-only hard delete + Clover void
   ====================================================================== */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth/next";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import {
  OrderStatus,
  PaymentMethod,
  CashCollectionStatus,
  DeliveryType,
} from "@prisma/client";
import { broadcast }      from "../live/route";
import { orderPushQueue } from "@/lib/clover/queues/orderPushQueue";

/* ────────────── Helper Functions ────────────── */
const isFriendlyId = (slug: string) => slug.startsWith("ORD-");

const resolveInternalId = async (slug: string): Promise<string | null> => {
  if (!isFriendlyId(slug)) return slug; // already a UUID
  const row = await prisma.order.findUnique({
    where:  { orderId: slug },
    select: { id: true },
  });
  return row?.id ?? null;
};

const slugFrom = (req: NextRequest) =>
  new URL(req.url).pathname.split("/").pop()!;

const statusRank: Record<OrderStatus, number> = {
  ORDER_RECEIVED:      0,
  IN_PROGRESS:         1,
  ORDER_READY:         2,
  PICKED_UP_BY_DRIVER: 3,
  ON_THE_WAY:          4,
  DELIVERED:           5,
  CANCELLED:           6,
  PENDING_PAYMENT:    -1,
};

async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const roles   = (session?.user?.roles ?? []).map(r => r.toUpperCase());
  return roles.includes("ADMIN") || roles.includes("SUPERADMIN");
}

/* ════════════════════════ 1. GET ════════════════════════ */
/* ------------------------------------------------------------------
 * GET /api/orders/:id – Return complete order record for dashboards
 *                     and confirmation pages (includes holeNumber)
 * ------------------------------------------------------------------ */
export async function GET(req: NextRequest) {
  const slug = slugFrom(req);
  const id   = await resolveInternalId(slug);
  if (!id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        // All scalar fields are returned by default
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
        driver: {
          select: { id: true, firstName: true, lastName: true },
        },
        staff: {
          select: { id: true, firstName: true, lastName: true },
        },
        lineItems: {
          include: { menuItem: true },
        },
        statusHistory: {
          orderBy: { timestamp: "asc" },
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        cashCollection: true,
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

/* ════════════════════════ 2. PATCH ════════════════════════ */
/* ------------------------------------------------------------------
 * PATCH /api/orders/:id – Advanced status machine + assignments
 *                       + side-effects (cash collection, payouts)
 * ------------------------------------------------------------------ */
export async function PATCH(req: NextRequest) {
  const slug   = slugFrom(req);
  const id     = await resolveInternalId(slug);
  if (!id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const payload = (await req.json()) as Partial<{
    status:   OrderStatus;
    driverId: number | null;
    staffId:  number | null;
  }>;

  const isDriverOnly = Object.keys(payload).length === 1 && "driverId" in payload;
  const isStaffOnly  = Object.keys(payload).length === 1 && "staffId"  in payload;

  const session = await getServerSession(authOptions);
  const actorId = session?.user?.id ? Number(session.user.id) : undefined;

  let changedBy = "System";
  if (session?.user) {
    const u: any = session.user;
    changedBy = u.firstName || u.lastName
      ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
      : u.name || u.email || "User";
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

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

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

    // Driver-only assignment
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

    // Staff-only assignment
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

    // Full-payload updates
    if ("driverId" in payload && payload.driverId !== existing.driverId) {
      await logHistory(existing.status);
    }
    if ("staffId" in payload && payload.staffId !== existing.staffId) {
      await logHistory(existing.status);
    }
    if (payload.status && payload.status !== existing.status) {
      await logHistory(payload.status);
    }

    const updateData: any = { ...payload };
    if (payload.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data:  updateData,
    });

    // Side-effects on DELIVERED
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

    // Void in Clover on CANCELLED
    if (payload.status === OrderStatus.CANCELLED && existing.cloverOrderId) {
      await orderPushQueue.add("void", {
        id,
        orderId: slug,
        force:   true,
      });
    }

    // Real-time updates
    if ("driverId" in payload) {
      broadcast({ id, field: "driverId", value: updatedOrder.driverId });
    }
    if ("staffId" in payload) {
      broadcast({ id, field: "staffId", value: updatedOrder.staffId });
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

/* ════════════════════════ 3. DELETE ════════════════════════ */
export async function DELETE(req: NextRequest) {
  const slug = slugFrom(req);
  const id   = await resolveInternalId(slug);
  if (!id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.order.findUnique({
      where:  { id },
      select: { cloverOrderId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (existing.cloverOrderId) {
      await orderPushQueue.add("void", {
        id,
        orderId: slug,
        force:   true,
      });
    }

    await prisma.$transaction([
      prisma.cashCollection.deleteMany({ where: { orderId: id } }),
      prisma.payout.deleteMany({ where: { orderId: id } }),
      prisma.orderStatusHistory.deleteMany({ where: { orderId: id } }),
      prisma.orderLineItem.deleteMany({ where: { orderId: id } }),
      prisma.order.delete({ where: { id } }),
    ]);

    broadcast({ id, field: "deleted", value: true });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error(`[DELETE /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
