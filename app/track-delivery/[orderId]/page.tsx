// File: app/track-delivery/[orderId]/page.tsx

import React from "react";
import { prisma } from "@/lib/prisma";
import DeliveryTracking, {
  DeliveryTrackingProps,
} from "@/components/deliverytracking/DeliveryTracking";

interface TrackDeliveryPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function TrackDeliveryPage({
  params,
}: TrackDeliveryPageProps) {
  const { orderId } = await params;

  // Fetch the extra fields we surfaced in the API
  const order = await prisma.order.findUnique({
    where: { orderId },
    select: {
      id:           true,
      orderId:      true,
      status:       true,
      deliveryType: true,
      holeNumber:   true,
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

  // Build the exact shape DeliveryTracking expects
  const initialOrder: DeliveryTrackingProps["initialOrder"] = {
    id:           order.id,
    orderId:      order.orderId,
    status:       order.status,
    deliveryType: order.deliveryType,
    holeNumber:   order.holeNumber ?? undefined,
    serverName:
      order.staff != null
        ? `${order.staff.firstName} ${order.staff.lastName}`.trim()
        : undefined,
  };

  return <DeliveryTracking initialOrder={initialOrder} />;
}
