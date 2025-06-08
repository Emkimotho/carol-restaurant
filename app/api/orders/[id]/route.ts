// File: app/api/orders/[id]/route.ts
/* =======================================================================
   • Handles GET/PATCH/DELETE for both UUID and friendly “ORD-…” slugs.
   • GET now returns `{ order }` so the client can destructure `{ order }`.
   • Includes holeNumber so on-course golf orders can display the hole.
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
} from "@prisma/client";
import { broadcast } from "../live/route";

/** true ⇒ slug is a friendly order code, false ⇒ UUID PK */
const isFriendlyId = (slug: string) => slug.startsWith("ORD-");

/** Resolve a slug (PK or friendly) → the real internal UUID */
const resolveInternalId = async (slug: string): Promise<string | null> => {
  if (!isFriendlyId(slug)) return slug; // already the PK
  const row = await prisma.order.findUnique({
    where: { orderId: slug },
    select: { id: true },
  });
  return row?.id ?? null;
};

/** Extract the slug from the end of the request path */
const slugFrom = (req: NextRequest) =>
  new URL(req.url).pathname.split("/").pop()!;

/* ──────────────────────────── GET ────────────────────────────────── */
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
        customer:      { select: { firstName: true, lastName: true, email: true } },
        driver:        { select: { id: true, firstName: true, lastName: true } },
        staff:         { select: { id: true, firstName: true, lastName: true } },
        lineItems:     { include: { menuItem: true } },
        statusHistory: {
          orderBy: { timestamp: "asc" },
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        cashCollection: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    // Wrap in { order } so client-side `const { order } = await res.json()` works
    return NextResponse.json({ order });
  } catch (err: any) {
    console.error(`[GET /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────────────────── PATCH ───────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const slug    = slugFrom(req);
  const id      = await resolveInternalId(slug);
  if (!id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const payload = (await req.json()) as Partial<{
    status:   OrderStatus;
    driverId: number | null;
    [k: string]: unknown;
  }>;

  const session   = await getServerSession(authOptions);
  const actorId   = session?.user?.id ? Number(session.user.id) : undefined;
  const actorExists = !!actorId && await prisma.user.findUnique({ where: { id: actorId } });

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        paymentMethod: true,
        driverPayout:   true,
        tipAmount:      true,
        staffId:        true,
        driverId:       true,
        deliveryType:   true,
      },
    });
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if ("driverId" in payload) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status:  OrderStatus.IN_PROGRESS,
          ...(actorExists ? { userId: actorId! } : {}),
        },
      });
    }

    if (payload.status) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status:  payload.status!,
          ...(actorExists ? { userId: actorId! } : {}),
        },
      });
    }

    const updateData: any = { ...payload };
    if (payload.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data:  updateData,
    });

    // Cash-collection for Delivered + Cash payments
    if (
      payload.status === OrderStatus.DELIVERED &&
      existingOrder.paymentMethod === PaymentMethod.CASH &&
      actorExists
    ) {
      await prisma.cashCollection.create({
        data: {
          orderId:  id,
          serverId: actorId!,
          amount:   updatedOrder.totalAmount,
          status:   CashCollectionStatus.PENDING,
        },
      });
    }

    // Payouts on Delivered
    if (payload.status === OrderStatus.DELIVERED) {
      if (updatedOrder.driverId && existingOrder.driverPayout! > 0) {
        await prisma.payout.create({
          data: {
            userId:   updatedOrder.driverId,
            orderId:  updatedOrder.id,
            amount:   existingOrder.driverPayout!,
            category: "DRIVER_PAYOUT",
          },
        });
      }
      if (
        updatedOrder.staffId &&
        existingOrder.tipAmount! > 0 &&
        existingOrder.deliveryType !== DeliveryType.DELIVERY
      ) {
        await prisma.payout.create({
          data: {
            userId:   updatedOrder.staffId!,
            orderId:  updatedOrder.id,
            amount:   existingOrder.tipAmount!,
            category: "SERVER_TIP",
          },
        });
      }
    }

    // Broadcast WS updates
    if ("driverId" in payload) broadcast({ id, field: "driverId", value: payload.driverId });
    if (payload.status)        broadcast({ id, field: "status",   value: payload.status });

    return NextResponse.json(updatedOrder);
  } catch (err: any) {
    console.error(`[PATCH /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────────────────── DELETE ──────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const slug = slugFrom(req);
  const id   = await resolveInternalId(slug);
  if (!id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  try {
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await prisma.cashCollection.deleteMany({ where: { orderId: id } });
    await prisma.payout.deleteMany({         where: { orderId: id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: id } });
    await prisma.orderLineItem.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });

    broadcast({ id, field: "deleted", value: true });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error(`[DELETE /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
