// File: components/deliverytracking/DeliveryTracking.tsx
/* =======================================================================
   Real-time order-tracking widget
   • Works for golf (clubhouse / on-course / pavilion) and normal delivery
   • Displays customer-provided address when deliveryType === "DELIVERY"
   • Strict-mode TypeScript compatible
   ====================================================================== */

"use client";

import React, { useContext, useEffect, useState } from "react";
import Link                                       from "next/link";
import styles                                     from "./DeliveryTracking.module.css";

import { OrderContext } from "@/contexts/OrderContext";
import { useOrder }     from "@/hooks/useOrder";
import { getDeliveryLabel } from "@/utils/getDeliveryLabel";
import type { DeliveryType } from "@prisma/client";

/* ────────────────────────── Types & consts ────────────────────────── */
export interface DeliveryTrackingProps {
  initialOrder: {
    id:           string;
    orderId:      string;
    status:       string;
    deliveryType: DeliveryType;
    holeNumber?:  number | null;
    serverName?:  string | null;
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

const STEP_INDEX: Record<string, number> = {
  ORDER_RECEIVED:      0,
  IN_PROGRESS:         1,
  ORDER_READY:         2,
  PICKED_UP_BY_DRIVER: 3,
  ON_THE_WAY:          4,
  DELIVERED:           5,
};

/* =================================================================== */
export default function DeliveryTracking({ initialOrder }: DeliveryTrackingProps) {
  /* ── 1. Context / IDs ──────────────────────────────────────────── */
  const { order: ctxOrder } = useContext(OrderContext) ?? { order: {} as any };
  const orderId  = initialOrder?.id      ?? ctxOrder.id;
  const friendly = initialOrder?.orderId ?? ctxOrder.orderId;

  /* ── 2. Fetch current order snapshot (poll hook) ──────────────── */
  const { order: fetched, loading, error } = useOrder(orderId);

  /* ── 3. Live status (initial → fetch → websocket) ─────────────── */
  const [status, setStatus] = useState(
    initialOrder?.status ?? fetched?.status ?? "ORDER_RECEIVED"
  );
  useEffect(() => {
    if (fetched?.status) setStatus(fetched.status);
  }, [fetched?.status]);

  useEffect(() => {
    if (!orderId) return;
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws    = new WebSocket(`${proto}://${location.host}/api/ws?room=${orderId}`);
    ws.onmessage = (e) => {
      try {
        const { value } = JSON.parse(e.data);
        if (value.status) setStatus(value.status);
      } catch {/* ignore bad packets */}
    };
    return () => ws.close();
  }, [orderId]);

  /* ── 4. Delivery meta (typed) ─────────────────────────────────── */
  const deliveryType = (
    initialOrder?.deliveryType ??
    fetched?.deliveryType ??
    "PICKUP_AT_CLUBHOUSE"
  ) as DeliveryType;

  const isGolf     = deliveryType !== "DELIVERY";
  const holeNumber = initialOrder?.holeNumber ?? fetched?.holeNumber ?? null;
  const serverName = initialOrder?.serverName ?? fetched?.serverName ?? null;

  /* Safe access: deliveryAddress is not in OrderData type */
  const address = (fetched as any)?.deliveryAddress as
    | { street: string; city: string; state: string; zipCode: string }
    | undefined;

  /* ── 5. Steps (rename idx 3 when golf) ─────────────────────────── */
  const steps = BASE_STEPS.map((s, idx) =>
    idx === 3
      ? { ...s, label: isGolf ? `Picked Up by ${serverName ?? "Server"}` : s.label }
      : s
  );
  const currentStep = STEP_INDEX[status] ?? 0;

  /* ── 6. Labels & shortcut ─────────────────────────────────────── */
  const heading        = getDeliveryLabel(deliveryType, holeNumber);
  const clubhouseReady = isGolf &&
    deliveryType === "PICKUP_AT_CLUBHOUSE" &&
    currentStep >= STEP_INDEX["ORDER_READY"];

  const locationLabel = !isGolf
    ? address
      ? `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`
      : null
    : deliveryType === "ON_COURSE"
      ? holeNumber != null ? `Hole ${holeNumber}` : "Hole —"
      : deliveryType === "EVENT_PAVILION"
        ? "Pavilion"
        : null;

  /* ── 7. Render – short path (clubhouse already ready) ─────────── */
  if (clubhouseReady) {
    return (
      <div className={styles.container}>
        <div className={styles.trackingCard}>
          <h1 className={styles.title}>Ready for Pick-up!</h1>
          {friendly && <p className={styles.sub}>Order # {friendly}</p>}
          <p className={styles.message}>
            Your order is waiting at the clubhouse. Swing by whenever you’re ready!
          </p>
          <div className={styles.navigation}>
            <Link href="/menu"><button className={styles.navButton}>View Menu</button></Link>
            <Link href="/"><button className={styles.navButton}>Home</button></Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── 8. Render – full tracker ─────────────────────────────────── */
  return (
    <div className={styles.container}>
      <div className={styles.trackingCard}>
        <h1 className={styles.title}>{heading}</h1>

        {friendly      && <p className={styles.sub}>Order # {friendly}</p>}
        {locationLabel && <p className={styles.location}>{locationLabel}</p>}

        {/* progress bar */}
        <div className={styles.progressBar}>
          {steps.map((step, idx) => (
            <div key={idx} className={styles.stepContainer}>
              <div className={`${styles.circle} ${idx <= currentStep ? styles.active : ""}`}>
                <span className={styles.icon}>{step.icon}</span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`${styles.line} ${idx < currentStep ? styles.active : ""}`}
                />
              )}
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* status text */}
        <p className={styles.statusMessage}>
          {currentStep < steps.length - 1
            ? `Your order is ${steps[currentStep].label.toLowerCase()}…`
            : isGolf
              ? "Your order has arrived — enjoy!"
              : "Delivered! Enjoy your meal!"}
        </p>

        {/* contact */}
        <p className={styles.contact}>
          Questions? Call{" "}
          <strong>{isGolf ? serverName ?? "Server" : "Driver"} (240) 313-2819</strong>.
        </p>

        {/* nav */}
        <div className={styles.navigation}>
          <Link href="/menu"><button className={styles.navButton}>View Menu</button></Link>
          <Link href="/"><button className={styles.navButton}>Home</button></Link>
        </div>

        {/* overlays */}
        {loading && <div className={styles.overlay}>Loading…</div>}
        {error   && <div className={styles.overlay}>{String(error)}</div>}
      </div>
    </div>
  );
}
