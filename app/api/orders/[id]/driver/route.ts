// File: app/api/orders/[id]/driver/route.ts
/* ========================================================================== */
/*  PATCH  /api/orders/:id/driver                                             */
/*                                                                             */
/*  • Assign or unassign a driver (claim/release).                             */
/*  • Drivers may also change status through the sequence:                     */
/*      ORDER_READY → PICKED_UP_BY_DRIVER → ON_THE_WAY → DELIVERED             */
/*  • Staff/Admin can assign any driver and set any valid status.             */
/*  • Records audit trail and broadcasts updates to live dashboards.           */
/* ========================================================================== */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth/next";
import { authOptions }               from "@/lib/auth";
import prisma                        from "@/lib/prisma";
import { OrderStatus }               from "@prisma/client";
import { broadcast }                 from "../../live/route";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  // 1️⃣ Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  // 2️⃣ Authorization
  const roles    = session.user.roles.map(r => r.toLowerCase());
  const isAdmin  = roles.includes("admin") || roles.includes("superadmin");
  const isStaff  = roles.includes("staff");
  const isDriver = roles.includes("driver");
  if (!isAdmin && !isStaff && !isDriver) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3️⃣ Extract orderId & body
  const { id: orderId } = await params;
  const { driverId, nextStatus } = (await req.json()) as {
    driverId: number | null;
    nextStatus?: OrderStatus;
  };

  // 4️⃣ Validate driverId
  if (driverId !== null && Number.isNaN(driverId)) {
    return NextResponse.json(
      { error: "`driverId` must be a number or null" },
      { status: 400 }
    );
  }

  // 5️⃣ Fetch current order status
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const currentStatus = existing.status;

  // 6️⃣ Driver-only status transition rules
  if (isDriver && nextStatus !== undefined) {
    // Only define the transitions drivers can make; treat undefined for others
    const driverTransitions: Partial<Record<OrderStatus, OrderStatus>> = {
      [OrderStatus.ORDER_READY]:           OrderStatus.PICKED_UP_BY_DRIVER,
      [OrderStatus.PICKED_UP_BY_DRIVER]:   OrderStatus.ON_THE_WAY,
      [OrderStatus.ON_THE_WAY]:            OrderStatus.DELIVERED,
    };
    const allowedNext = driverTransitions[currentStatus];
    if (allowedNext !== nextStatus) {
      return NextResponse.json(
        {
          error: `Drivers may only transition ${currentStatus} → ${allowedNext}`,
        },
        { status: 403 }
      );
    }
  }

  // 7️⃣ Driver claim/release restriction
  if (isDriver) {
    if (driverId !== null && driverId !== session.user.id) {
      return NextResponse.json(
        { error: "Drivers may only claim/release their own orders" },
        { status: 403 }
      );
    }
  }

  // 8️⃣ Build update payload
  const data: Partial<{ driverId: number | null; status: OrderStatus }> = {
    driverId,
  };
  if (nextStatus !== undefined) {
    data.status = nextStatus;
  }

  // 9️⃣ Update order
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data,
  });

  // 🔟 Audit trail
  await prisma.orderStatusHistory.create({
    data: {
      orderId,
      status:    updatedOrder.status,
      changedBy: session.user.id.toString(),
    },
  });

  // 1️⃣1️⃣ Broadcast updates
  broadcast({ id: orderId, field: "driverId", value: updatedOrder.driverId });
  if (data.status !== undefined) {
    broadcast({ id: orderId, field: "status",   value: updatedOrder.status });
  }

  return NextResponse.json(updatedOrder);
}
