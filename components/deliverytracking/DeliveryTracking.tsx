// File: components/deliverytracking/DeliveryTracking.tsx
"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./DeliveryTracking.module.css";
import { OrderContext } from "@/contexts/OrderContext";
import { useOrder } from "@/hooks/useOrder";

interface Step { label: string; icon: string; }
const steps: Step[] = [
  { label: "Order Received",       icon: "📩" },
  { label: "In Progress",          icon: "👨‍🍳" },
  { label: "Order Ready",          icon: "🍽️" },
  { label: "Picked Up by Driver",  icon: "👨‍✈️" },
  { label: "On the Way",           icon: "🚗" },
  { label: "Delivered",            icon: "🏠" },
];

export interface DeliveryTrackingProps {
  initialOrder: { id: string; orderId: string; status: string } | null;
}

export default function DeliveryTracking({ initialOrder }: DeliveryTrackingProps) {
  const { order: contextOrder } = useContext(OrderContext) ?? { order: {} as any };
  const orderId = initialOrder?.id ?? contextOrder.id;
  const friendly = initialOrder?.orderId ?? contextOrder.orderId;

  // Centralized hook to fetch static order data
  const { order: fetchedOrder, loading: isLoading, error } = useOrder(orderId);

  // Local status state: seed from initial or fetched
  const [status, setStatus] = useState<string>(
    initialOrder?.status ?? fetchedOrder?.status ?? "ORDER_RECEIVED"
  );

  // Sync to fetchedOrder updates
  useEffect(() => {
    if (fetchedOrder?.status) {
      setStatus(fetchedOrder.status);
    }
  }, [fetchedOrder?.status]);

  // WebSocket for live updates
  useEffect(() => {
    if (!orderId) return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${protocol}://${window.location.host}/api/ws?room=${orderId}`
    );
    ws.onmessage = (e) => {
      try {
        const { value } = JSON.parse(e.data);
        if (value.status) setStatus(value.status);
      } catch {
        // ignore malformed
      }
    };
    return () => ws.close();
  }, [orderId]);

  const statusMap: Record<string, number> = {
    ORDER_RECEIVED:      0,
    IN_PROGRESS:         1,
    ORDER_READY:         2,
    PICKED_UP_BY_DRIVER: 3,
    ON_THE_WAY:          4,
    DELIVERED:           5,
  };
  const step = statusMap[status] ?? 0;

  return (
    <div className={styles.container}>
      <div className={styles.trackingCard}>
        <h1 className={styles.title}>Delivery Tracking</h1>

        {friendly && <p className={styles.orderId}>Order #: {friendly}</p>}
        {orderId  && <p className={styles.orderIdSmall}>Tracking ID: {orderId}</p>}

        <div className={styles.progressBar}>
          {steps.map((s, idx) => (
            <div key={idx} className={styles.stepContainer}>
              <div className={`${styles.circle} ${idx <= step ? styles.active : ""}`}>
                <span className={styles.icon}>{s.icon}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`${styles.line} ${idx < step ? styles.active : ""}`} />
              )}
              <div className={styles.labelContainer}>
                <span className={styles.stepLabel}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        <p className={styles.statusMessage}>
          {step < steps.length - 1
            ? `Your order is ${steps[step].label.toLowerCase()}…`
            : "Your order has been delivered! Enjoy your meal."}
        </p>

        <div className={styles.contact}>
          <p>Questions? Call <strong>(240) 313-2819</strong>.</p>
        </div>

        <div className={styles.navigation}>
          <Link href="/menu"><button className={styles.navButton}>View Menu</button></Link>
          <Link href="/"><button className={styles.navButton}>Home</button></Link>
        </div>
      </div>
    </div>
  );
}
