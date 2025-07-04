// File: app/track-delivery/[orderId]/page.tsx
/* ------------------------------------------------------------------
   SSR entry for the Track-Delivery screen
   ------------------------------------------------------------------ */
import React from "react";
import { prisma } from "@/lib/prisma";

import DeliveryTracking, {
  DeliveryTrackingProps,
} from "@/components/deliverytracking/DeliveryTracking";

interface TrackDeliveryPageProps {
  params: { orderId: string };
}

export default async function TrackDeliveryPage({
  params,
}: TrackDeliveryPageProps) {
  const { orderId } = params;           // ← plain object, not Promise

  /* ---- fetch the minimal fields the widget needs ---------------- */
  const order = await prisma.order.findUnique({
    where: { orderId },
    select: {
      id:           true,
      orderId:      true,
      status:       true,
      deliveryType: true,
      holeNumber:   true,
      deliveryAddress: true,            // ← add address for DELIVERY
      staff: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  if (!order) {
    return (
      <p style={{ padding: "2rem", textAlign: "center" }}>
        Order not found.
      </p>
    );
  }

  /* ---- build the exact shape expected by <DeliveryTracking/> ---- */
  const initialOrder: DeliveryTrackingProps["initialOrder"] = {
    id:           order.id,
    orderId:      order.orderId,
    status:       order.status,
    deliveryType: order.deliveryType,
    holeNumber:   order.holeNumber ?? undefined,
    serverName:   order.staff
      ? `${order.staff.firstName} ${order.staff.lastName}`.trim()
      : undefined,
  };

  /* normal-delivery address is read inside the component from SWR /
     hook fetch; but you can pass it via context if you want:        */
  // (DeliveryTracking can pick it up from fetched snapshot)

  return <DeliveryTracking initialOrder={initialOrder} />;
}
