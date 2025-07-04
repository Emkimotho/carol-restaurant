// File: components/payment-confirmation/CashPaymentConfirmation.tsx
/* =======================================================================
   Cash-Order Confirmation  (with optional live-tracking link)
   ====================================================================== */

"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter, useSearchParams }             from "next/navigation";

import { OrderContext } from "@/contexts/OrderContext";
import { CartContext }  from "@/contexts/CartContext";

import { getDeliveryLabel } from "@/utils/getDeliveryLabel";
import type { DeliveryType } from "@prisma/client";

import styles from "./PaymentConfirmation.module.css";

/* ───────────────────────────── Types ───────────────────────────── */
interface FetchedOrder {
  id:           string;
  orderId:      string;
  totalAmount:  number;
  deliveryType: DeliveryType;
  holeNumber?:  number | null;
  guestEmail?:  string | null;
  status:       string;
  createdAt:    string;      // ISO
}

/* ────────────────────────── Helpers ───────────────────────────── */
const money = (n: number) => `$${n.toFixed(2)}`;

/* ================================================================= */
export default function CashPaymentConfirmation() {
  const router = useRouter();
  const params = useSearchParams();
  const dbId   = params.get("id") ?? "";

  /* ----------------------------------------------------------------
     Contexts
  ---------------------------------------------------------------- */
  const orderCtx = useContext(OrderContext);
  const cartCtx  = useContext(CartContext);
  if (!orderCtx || !cartCtx) return null;

  const { order: ctxOrder } = orderCtx;
  const { clearCart }       = cartCtx;

  /* ----------------------------------------------------------------
     Local state
  ---------------------------------------------------------------- */
  const [order,     setOrder]     = useState<FetchedOrder | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  /* ----------------------------------------------------------------
     1. Clear cart on mount
  ---------------------------------------------------------------- */
  useEffect(() => clearCart(), [clearCart]);

  /* ----------------------------------------------------------------
     2. Fetch order from DB
  ---------------------------------------------------------------- */
  useEffect(() => {
    if (!dbId) return;
    setLoading(true);
    fetch(`/api/orders/${encodeURIComponent(dbId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Status ${r.status}`);
        const { order } = await r.json();
        setOrder(order);
      })
      .catch(() => setError("Could not load order details."))
      .finally(() => setLoading(false));
  }, [dbId]);

  /* ----------------------------------------------------------------
     3. Send confirmation email (once)
  ---------------------------------------------------------------- */
  useEffect(() => {
    const snap = order ?? ctxOrder;
    if (emailSent || !snap?.guestEmail) return;

    fetch("/api/send-email", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to:      snap.guestEmail,
        subject: "19th Hole — Cash Order Confirmation",
        text:    `Your order #${snap.orderId} for ${money(
          snap.totalAmount
        )} has been placed. Please have cash ready when we deliver.`,
        html:    `<p>Your order <strong>#${snap.orderId}</strong> for <strong>${money(
          snap.totalAmount
        )}</strong> has been placed. Please have cash ready when we deliver.</p>`,
      }),
    })
      .then((r) => r.ok && setEmailSent(true))
      .catch(console.error);
  }, [order, ctxOrder, emailSent]);

  /* ----------------------------------------------------------------
     4. Loading / error guards
  ---------------------------------------------------------------- */
  if (loading) return <div className={styles.message}>Loading order…</div>;
  if (error)   return <div className={styles.message}>{error}</div>;

  /* ----------------------------------------------------------------
     5. Snapshot (prefer DB over context)
  ---------------------------------------------------------------- */
  const o   = (order ?? ctxOrder) as FetchedOrder;
  const amt = money(o.totalAmount);

  /* ----------------------------------------------------------------
     6. Heading & instruction
  ---------------------------------------------------------------- */
  const heading = getDeliveryLabel(o.deliveryType, o.holeNumber);

  let instruction: React.ReactNode;
  switch (o.deliveryType) {
    case "ON_COURSE":
      instruction =
        o.holeNumber != null ? (
          <>
            We’ll bring your order to hole&nbsp;
            <strong>{o.holeNumber}</strong> — please have{" "}
            <strong>{amt}</strong> ready.
          </>
        ) : (
          <>
            We’ll bring your order straight to your hole — please have{" "}
            <strong>{amt}</strong> ready.
          </>
        );
      break;

    case "EVENT_PAVILION":
      instruction = (
        <>
          We’ll deliver to the pavilion — please have{" "}
          <strong>{amt}</strong> ready.
        </>
      );
      break;

    case "PICKUP_AT_CLUBHOUSE":
    default:
      instruction = (
        <>
          Please pick up your order at the clubhouse and have{" "}
          <strong>{amt}</strong> ready.
        </>
      );
  }

  /* =================================================================
     Render
  ================================================================= */
  return (
    <div className={styles.container}>
      <div className={styles.confirmationCard}>
        {/* ✔️ icon */}
        <div className={styles.iconWrapper}>
          <svg className={styles.checkIcon} viewBox="0 0 52 52">
            <circle className={styles.checkCircle} cx="26" cy="26" r="25" />
            <path   className={styles.checkMark}  d="M14.1 27.2 21.2 34.4 37.9 17.6" />
          </svg>
        </div>

        <h1 className={styles.title}>{heading}</h1>
        <p className={styles.message}>{instruction}</p>

        {/* Order facts */}
        <div className={styles.factGrid}>
          <div>
            <span className={styles.factLabel}>Order #</span>
            <span>{o.orderId}</span>
          </div>
          <div>
            <span className={styles.factLabel}>Status</span>
            <span>{o.status.replace(/_/g, " ")}</span>
          </div>
        </div>

        {/* Navigation buttons */}
        {o.orderId && (
          <div className={styles.navigation}>
            <button
              onClick={() => router.push(`/track-delivery/${o.orderId}`)}
              className="btn"
            >
              Track My Order
            </button>
            <button
              onClick={() => router.push("/menu")}
              className="btn secondary"
            >
              View Menu
            </button>
            <button
              onClick={() => router.push("/")}
              className="btn secondary"
            >
              Home
            </button>
          </div>
        )}

        {/* Footer note */}
        <p className={styles.note}>
          You’ll receive a confirmation email shortly. Thanks for choosing the
          19<sup>th</sup> Hole!
        </p>
      </div>
    </div>
  );
}
