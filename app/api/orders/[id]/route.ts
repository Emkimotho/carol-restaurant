// File: app/api/orders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  OrderStatus,
  PaymentMethod,
  CashCollectionStatus,
} from "@prisma/client";
import { broadcast } from "../live/route";

//
// Helper to grab the “id” slug (which is the internal Order.id) from the URL
//
const internalOrderIdFrom = (req: NextRequest) =>
  new URL(req.url).pathname.split("/").pop()!;

/* ───────────────────────────── GET ─────────────────────────────────── */
export async function GET(req: NextRequest) {
  const id = internalOrderIdFrom(req);

  try {
    // Find by internal PK “id” and include all the same relations as before
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
        lineItems: { include: { menuItem: true } },
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

    return NextResponse.json(order);
  } catch (err: any) {
    console.error(`[GET /api/orders/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────────────────── PATCH ────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  const id = internalOrderIdFrom(req);
  const payload = (await req.json()) as Partial<{
    status: OrderStatus;
    driverId: number | null;
    [k: string]: unknown;
  }>;

  // 1️⃣ Identify the acting user (for history‐tracking, etc.)
  const session = await getServerSession(authOptions);
  const actorId = session?.user?.id ? Number(session.user.id) : undefined;
  const actorExists =
    actorId &&
    (await prisma.user.findUnique({ where: { id: actorId } })) !== null;

  try {
    // 2️⃣ Fetch the existing row’s paymentMethod, driverPayout, tipAmount, staffId
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        paymentMethod: true,
        driverPayout: true,
        tipAmount: true,
        staffId: true,
        driverId: true,
      },
    });
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 3️⃣ If “driverId” is changing, record an IN_PROGRESS status history entry
    if ("driverId" in payload) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status: OrderStatus.IN_PROGRESS,
          ...(actorExists ? { userId: actorId! } : {}),
        },
      });
    }

    // 4️⃣ If “status” is provided, record that status change
    if (payload.status) {
      await prisma.orderStatusHistory.create({
        data: {
          orderId: id,
          status: payload.status!,
          ...(actorExists ? { userId: actorId! } : {}),
        },
      });
    }

    // 5️⃣ Build the update object; if status → DELIVERED, stamp deliveredAt
    const updateData: any = { ...payload };
    if (payload.status === OrderStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    }

    // 6️⃣ Apply the update
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // 7️⃣ If status changed to PICKED_UP_BY_DRIVER & paymentMethod = CASH, create a cashCollection record
    if (
      payload.status === OrderStatus.PICKED_UP_BY_DRIVER &&
      existingOrder.paymentMethod === PaymentMethod.CASH &&
      actorExists
    ) {
      await prisma.cashCollection.create({
        data: {
          orderId: id,
          serverId: actorId!,
          amount: updatedOrder.totalAmount,
          status: CashCollectionStatus.PENDING,
        },
      });
    }

    // 8️⃣ If status changed to DELIVERED, create any payouts for driver & server
    if (payload.status === OrderStatus.DELIVERED) {
      // ● Driver payout
      if (updatedOrder.driverId && existingOrder.driverPayout! > 0) {
        await prisma.payout.create({
          data: {
            userId: updatedOrder.driverId,
            orderId: updatedOrder.id,
            amount: existingOrder.driverPayout!,
            category: "DRIVER_PAYOUT",
          },
        });
      }
      // ● Server tip payout
      if (updatedOrder.staffId && existingOrder.tipAmount! > 0) {
        await prisma.payout.create({
          data: {
            userId: updatedOrder.staffId!,
            orderId: updatedOrder.id,
            amount: existingOrder.tipAmount!,
            category: "SERVER_TIP",
          },
        });
      }
    }

    // 9️⃣ Broadcast WebSocket updates if driverId or status changed
    if ("driverId" in payload) {
      broadcast({ id, field: "driverId", value: payload.driverId });
    }
    if (payload.status) {
      broadcast({ id, field: "status", value: payload.status });
    }

    return NextResponse.json(updatedOrder);
  } catch (err: any) {
    console.error(`[PATCH /api/orders/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ─────────────────────────── DELETE ────────────────────────────────── */
export async function DELETE(req: NextRequest) {
  const id = internalOrderIdFrom(req);

  try {
    // 1️⃣ Verify the row exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2️⃣ Delete any dependent rows first

    // Remove associated cash collections
    await prisma.cashCollection.deleteMany({
      where: { orderId: id },
    });

    // Remove associated payouts
    await prisma.payout.deleteMany({
      where: { orderId: id },
    });

    // Remove associated order status history
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: id },
    });

    // Remove associated line items
    await prisma.orderLineItem.deleteMany({
      where: { orderId: id },
    });

    // (If you have other models referencing orderId, delete them here similarly.)

    // 3️⃣ Now delete the order itself
    await prisma.order.delete({ where: { id } });

    // 4️⃣ Broadcast “deleted”
    broadcast({ id, field: "deleted", value: true });

    // Return 204 No Content with an empty response
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error(`[DELETE /api/orders/${id}]`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
