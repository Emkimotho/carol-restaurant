// File: app/track-delivery/[orderId]/page.tsx

import React from "react";
import { prisma } from "@/lib/prisma";
import DeliveryTracking from "@/components/deliverytracking/DeliveryTracking";

interface TrackDeliveryPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function TrackDeliveryPage({
  params,
}: TrackDeliveryPageProps) {
  // In Next.js 15, params is asynchronous
  const { orderId } = await params;

  // Query by the friendly orderId field, not the numeric ID
  const order = await prisma.order.findUnique({
    where: { orderId },
    select: { id: true, orderId: true, status: true },
  });

  if (!order) {
    return (
      <p style={{ padding: "2rem", textAlign: "center" }}>
        Order not found.
      </p>
    );
  }

  return <DeliveryTracking initialOrder={order} />;
}
