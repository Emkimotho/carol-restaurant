// File: app/api/orders/[id]/route.ts
/* ======================================================================= *
   19th-Hole • Unified Order CRUD (UUID + “ORD-…”)                          *
   ======================================================================= *
   • GET     full order (all relations)                                    *
   • PATCH   rich status workflow + history + payouts / cash collection    *
   • DELETE  admin hard-delete + Clover void                               *
   * ===================================================================== */

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

/* ─── helpers ─────────────────────────────────────────────────────────── */
const friendly = (slug: string) => slug.startsWith("ORD-");

const toUUID = async (slug: string): Promise<string | null> => {
  if (!friendly(slug)) return slug;                      // already UUID
  const row = await prisma.order.findUnique({
    where:  { orderId: slug },
    select: { id: true },
  });
  return row?.id ?? null;
};

const slugOf = (req: NextRequest) =>
  new URL(req.url).pathname.split("/").pop()!;

const rank: Record<OrderStatus, number> = {
  ORDER_RECEIVED:      0,
  IN_PROGRESS:         1,
  ORDER_READY:         2,
  PICKED_UP_BY_DRIVER: 3,
  ON_THE_WAY:          4,
  DELIVERED:           5,
  CANCELLED:           6,
  PENDING_PAYMENT:    -1,
};

const amAdmin = async () => {
  const s = await getServerSession(authOptions);
  const roles = (s?.user?.roles ?? []).map((r: string) => r.toUpperCase());
  return roles.includes("ADMIN") || roles.includes("SUPERADMIN");
};

/* ═══════════════ 1. GET ═══════════════ */
export async function GET(req: NextRequest) {
  const slug = slugOf(req);
  const id   = await toUUID(slug);
  if (!id) return NextResponse.json({ error: "Order not found" }, { status: 404 });

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
          include : { user: { select: { firstName: true, lastName: true } } },
        },
        cashCollection: true,
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err: any) {
    console.error(`[GET /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════ 2. PATCH ═══════════════ */
export async function PATCH(req: NextRequest) {
  const slug = slugOf(req);
  const id   = await toUUID(slug);
  if (!id) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const payload = (await req.json()) as Partial<{
    status:   OrderStatus;
    driverId: number | null;
    staffId:  number | null;
  }>;

  const onlyDriver = Object.keys(payload).length === 1 && "driverId" in payload;
  const onlyStaff  = Object.keys(payload).length === 1 && "staffId"  in payload;

  /* actor info (for history rows) */
  const session  = await getServerSession(authOptions);
  const actorId  = session?.user?.id ? Number(session.user.id) : undefined;
  const actorTag = session?.user
    ? `${(session.user as any).firstName ?? ""} ${(session.user as any).lastName ?? ""}`.trim() ||
      session.user.name ||
      session.user.email ||
      "User"
    : "System";

  const actorExists = actorId
    ? !!(await prisma.user.findUnique({ where: { id: actorId } }))
    : false;

  const writeHistory = (st: OrderStatus) =>
    prisma.orderStatusHistory.create({
      data: {
        orderId: id,
        status : st,
        changedBy: actorTag,
        ...(actorExists ? { userId: actorId! } : {}),
      },
    });

  try {
    const current = await prisma.order.findUnique({
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
    if (!current)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    /* ── 2.1  rank-check (backwards forbidden) ───────────────────── */
    if (payload.status) {
      const oldR = rank[current.status];
      const newR = rank[payload.status];

      /* special shortcut: clubhouse pickup can jump straight to DELIVERED */
      const shortcut =
        current.deliveryType === DeliveryType.PICKUP_AT_CLUBHOUSE &&
        payload.status === OrderStatus.DELIVERED;

      if (newR < oldR && !shortcut) {
        return NextResponse.json(
          { error: "Backward status change not allowed" },
          { status: 409 },
        );
      }
    }

    /* ── 2.2  driver / staff single-field patches ────────────────── */
    if (onlyDriver) {
      if (payload.driverId !== current.driverId) await writeHistory(current.status);
      const upd = await prisma.order.update({ where: { id }, data: { driverId: payload.driverId } });
      broadcast({ id, field: "driverId", value: upd.driverId });
      return NextResponse.json(upd);
    }

    if (onlyStaff) {
      if (payload.staffId !== current.staffId) await writeHistory(current.status);
      const upd = await prisma.order.update({ where: { id }, data: { staffId: payload.staffId } });
      broadcast({ id, field: "staffId", value: upd.staffId });
      return NextResponse.json(upd);
    }

    /* ── 2.3  full-payload update ────────────────────────────────── */
    if ("driverId" in payload && payload.driverId !== current.driverId)
      await writeHistory(current.status);
    if ("staffId" in payload && payload.staffId !== current.staffId)
      await writeHistory(current.status);
    if (payload.status && payload.status !== current.status)
      await writeHistory(payload.status);

    const data: any = { ...payload };
    if (payload.status === OrderStatus.DELIVERED) data.deliveredAt = new Date();

    const updated = await prisma.order.update({ where: { id }, data });

    /* ── 2.4  side-effects on DELIVERED ───────────────────────────── */
    if (
      payload.status === OrderStatus.DELIVERED &&
      current.paymentMethod === PaymentMethod.CASH &&
      actorExists
    ) {
      await prisma.cashCollection.create({
        data: {
          orderId : id,
          serverId: actorId!,
          amount  : current.totalAmount,
          status  : CashCollectionStatus.PENDING,
        },
      });
    }

    if (payload.status === OrderStatus.DELIVERED) {
      if (updated.driverId && current.driverPayout! > 0) {
        await prisma.payout.create({
          data: {
            userId  : updated.driverId,
            orderId : updated.id,
            amount  : current.driverPayout!,
            category: "DRIVER_PAYOUT",
          },
        });
      }
      if (
        updated.staffId &&
        current.tipAmount! > 0 &&
        current.deliveryType !== DeliveryType.DELIVERY
      ) {
        await prisma.payout.create({
          data: {
            userId  : updated.staffId!,
            orderId : updated.id,
            amount  : current.tipAmount!,
            category: "SERVER_TIP",
          },
        });
      }
    }

    /* ── 2.5  Clover void on CANCELLED ───────────────────────────── */
    if (payload.status === OrderStatus.CANCELLED && current.cloverOrderId) {
      await orderPushQueue.add("void", { id, orderId: slug, force: true });
    }

    /* ── 2.6  real-time broadcast ────────────────────────────────── */
    if ("driverId" in payload) broadcast({ id, field: "driverId", value: updated.driverId });
    if ("staffId"  in payload) broadcast({ id, field: "staffId",  value: updated.staffId  });
    if (payload.status)        broadcast({ id, field: "status",   value: updated.status   });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error(`[PATCH /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ═══════════════ 3. DELETE ═══════════════ */
export async function DELETE(req: NextRequest) {
  const slug = slugOf(req);
  const id   = await toUUID(slug);
  if (!id) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!(await amAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const existing = await prisma.order.findUnique({
      where : { id },
      select: { cloverOrderId: true },
    });
    if (!existing)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (existing.cloverOrderId) {
      await orderPushQueue.add("void", { id, orderId: slug, force: true });
    }

    await prisma.$transaction([
      prisma.cashCollection.deleteMany({      where: { orderId: id } }),
      prisma.payout.deleteMany({              where: { orderId: id } }),
      prisma.orderStatusHistory.deleteMany({  where: { orderId: id } }),
      prisma.orderLineItem.deleteMany({       where: { orderId: id } }),
      prisma.order.delete({ where: { id } }),
    ]);

    broadcast({ id, field: "deleted", value: true });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error(`[DELETE /api/orders/${slug}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
