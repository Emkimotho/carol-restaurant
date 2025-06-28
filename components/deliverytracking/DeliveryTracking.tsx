"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./DeliveryTracking.module.css";
import { OrderContext } from "@/contexts/OrderContext";
import { useOrder, OrderData } from "@/hooks/useOrder";

export interface DeliveryTrackingProps {
  initialOrder: {
    id:            string;
    orderId:       string;
    status:        string;
    deliveryType:  string;
    holeNumber?:   number;
    serverName?:   string;
  } | null;
}

const BASE_STEPS = [
  { label: "Order Received",       icon: "📩" },
  { label: "In Progress",          icon: "👨‍🍳" },
  { label: "Order Ready",          icon: "🍽️" },
  { label: "Picked Up by Driver",  icon: "🚗" },
  { label: "On the Way",           icon: "🚚" },
  { label: "Delivered",            icon: "🏁" },
];

export default function DeliveryTracking({
  initialOrder,
}: DeliveryTrackingProps) {
  const { order: ctxOrder } = useContext(OrderContext) ?? { order: {} as any };
  const orderId   = initialOrder?.id      ?? ctxOrder.id;
  const friendly  = initialOrder?.orderId ?? ctxOrder.orderId;

  // fetch latest status, deliveryType, etc.
  const { order: fetched, loading, error } = useOrder(orderId);

  // derive current status (server truth)
  const [status, setStatus] = useState(
    initialOrder?.status ?? fetched?.status ?? "ORDER_RECEIVED"
  );
  useEffect(() => {
    if (fetched?.status) setStatus(fetched.status);
  }, [fetched?.status]);

  // live websocket updates
  useEffect(() => {
    if (!orderId) return;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${window.location.host}/api/ws?room=${orderId}`);
    ws.onmessage = (e) => {
      try {
        const { value } = JSON.parse(e.data);
        if (value.status) setStatus(value.status);
      } catch {}
    };
    return () => ws.close();
  }, [orderId]);

  // map statuses to progress-bar steps
  const statusMap: Record<string, number> = {
    ORDER_RECEIVED:      0,
    IN_PROGRESS:         1,
    ORDER_READY:         2,
    PICKED_UP_BY_DRIVER: 3,
    ON_THE_WAY:          4,
    DELIVERED:           5,
  };
  const currentStep = statusMap[status] ?? 0;

  // golf vs. regular
  const deliveryType = initialOrder?.deliveryType ?? fetched?.deliveryType;
  const isGolf       = deliveryType !== "DELIVERY";
  const holeNumber   = initialOrder?.holeNumber ?? fetched?.holeNumber;
  const serverName   = initialOrder?.serverName ?? fetched?.serverName;

  // personalize “Picked up” label for golf orders
  const steps = BASE_STEPS.map((s, idx) =>
    idx === 3
      ? {
          ...s,
          label: isGolf
            ? `Picked Up by ${serverName ?? "Server"}`
            : s.label,
        }
      : s
  );

  // ─── CLUBHOUSE PICKUP SHORTCUT ───
  // only show when the kitchen has actually marked ORDER_READY
  if (
    isGolf &&
    deliveryType === "PICKUP_AT_CLUBHOUSE" &&
    statusMap[status] >= statusMap["ORDER_READY"]
  ) {
    return (
      <div className={styles.container}>
        <div className={styles.trackingCard}>
          <h1 className={styles.title}>Ready for Pickup!</h1>
          {friendly && <p className={styles.sub}>Order # {friendly}</p>}
          <p className={styles.message}>
            Your order is hot and waiting at the clubhouse. Swing by when you’re ready!
          </p>
          <div className={styles.navigation}>
            <Link href="/menu">
              <button className={styles.navButton}>View Menu</button>
            </Link>
            <Link href="/">
              <button className={styles.navButton}>Home</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── ON-COURSE / PAVILION HEADER ───
  const locationLabel =
    deliveryType === "ON_COURSE"
      ? `Hole ${holeNumber ?? "—"}`
      : deliveryType === "EVENT_PAVILION"
      ? "Pavilion"
      : null;

  return (
    <div className={styles.container}>
      <div className={styles.trackingCard}>
        <h1 className={styles.title}>
          {isGolf
            ? deliveryType === "ON_COURSE"
              ? "On-Course Delivery"
              : "Pavilion Delivery"
            : "Delivery Tracking"}
        </h1>

        {friendly && <p className={styles.sub}>Order # {friendly}</p>}
        {locationLabel && (
          <p className={styles.location}>Delivering to {locationLabel}</p>
        )}

        <div className={styles.progressBar}>
          {steps.map((stepDef, idx) => (
            <div key={idx} className={styles.stepContainer}>
              <div
                className={`${styles.circle} ${
                  idx <= currentStep ? styles.active : ""
                }`}
              >
                <span className={styles.icon}>{stepDef.icon}</span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`${styles.line} ${
                    idx < currentStep ? styles.active : ""
                  }`}
                />
              )}
              <div className={styles.labelContainer}>
                <span className={styles.stepLabel}>{stepDef.label}</span>
              </div>
            </div>
          ))}
        </div>

        <p className={styles.statusMessage}>
          {currentStep < steps.length - 1
            ? `Your order is ${steps[currentStep].label.toLowerCase()}…`
            : isGolf
            ? "Your order has arrived—enjoy!"
            : "Delivered! Enjoy your meal!"}
        </p>

        <div className={styles.contact}>
          <p>
            Questions? Call{" "}
            <strong>
              {isGolf ? serverName ?? "Server" : "Driver"} (240) 313-2819
            </strong>
            .
          </p>
        </div>

        <div className={styles.navigation}>
          <Link href="/menu">
            <button className={styles.navButton}>View Menu</button>
          </Link>
          <Link href="/">
            <button className={styles.navButton}>Home</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
