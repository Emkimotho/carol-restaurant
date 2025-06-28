// File: app/payment-confirmation/cash/page.tsx
"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { OrderContext } from "@/contexts/OrderContext";
import { CartContext }  from "@/contexts/CartContext";

import styles from "./PaymentConfirmation.module.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface FetchedOrder {
  id:           string;
  orderId:      string;
  totalAmount:  number;
  deliveryType: "PICKUP_AT_CLUBHOUSE" | "ON_COURSE" | "EVENT_PAVILION";
  holeNumber?:  number;
  guestEmail?:  string | null;
  status:       string;
  createdAt:    string; // ISO
}

const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

/* ================================================================== */
/*  Component                                                         */
/* ================================================================== */
export default function CashPaymentConfirmation() {
  const router  = useRouter();
  const params  = useSearchParams();
  const dbId    = params.get("id") ?? "";

  const orderCtx = useContext(OrderContext);
  const cartCtx  = useContext(CartContext);
  if (!orderCtx || !cartCtx) return null;

  /* -------- clear cart exactly once (fixes infinite loop) -------- */
  const { clearCart } = cartCtx;
  useEffect(() => { clearCart(); }, [clearCart]);

  /* ---------------- local state ---------------------------------- */
  const [order,      setOrder]      = useState<FetchedOrder | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [emailSent,  setEmailSent]  = useState(false);

  /* 1️⃣ fetch order from API -------------------------------------- */
  useEffect(() => {
    if (!dbId) return;
    setLoading(true);
    fetch(`/api/orders/${encodeURIComponent(dbId)}`)
      .then(async r => {
        if (!r.ok) throw new Error(`Status ${r.status}`);
        const { order } = await r.json();
        setOrder(order as FetchedOrder);
      })
      .catch(() => setError("Could not load order details."))
      .finally(() => setLoading(false));
  }, [dbId]);

  /* 2️⃣ send confirmation email once ------------------------------ */
  useEffect(() => {
    const o = order ?? orderCtx.order;
    if (emailSent || !o?.guestEmail) return;

    fetch("/api/send-email", {
      method: "POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        to:      o.guestEmail,
        subject: "19th Hole — Cash Order Confirmation",
        text:    `Your order #${o.orderId} for ${fmtMoney(o.totalAmount)} has been placed. Please have cash ready when we deliver.`,
        html:    `<p>Your order <strong>#${o.orderId}</strong> for <strong>${fmtMoney(o.totalAmount)}</strong> has been placed. Please have cash ready when we deliver.</p>`
      })
    })
      .then(r => r.ok && setEmailSent(true))
      .catch(console.error);
  }, [order, orderCtx.order, emailSent]);

  /* ---------------- loading / error UI --------------------------- */
  if (loading) return <div className={styles.message}>Loading order…</div>;
  if (error)   return <div className={styles.message}>{error}</div>;

  /* ---------------- final payload & display ---------------------- */
  const o   = (order ?? orderCtx.order) as FetchedOrder;
  const amt = fmtMoney(o.totalAmount);

  let heading: string;
  let instruction: React.ReactNode;

  switch (o.deliveryType) {
    case "PICKUP_AT_CLUBHOUSE":
      heading     = "Pickup at Clubhouse";
      instruction = <>Please pick up your order at the clubhouse and have <strong>{amt}</strong> in hand.</>;
      break;
    case "ON_COURSE":
      heading     = o.holeNumber != null
        ? `On-Course Delivery (Hole ${o.holeNumber})`
        : "On-Course Delivery";
      instruction = <>We’ll bring your order straight to your hole—please have <strong>{amt}</strong> ready.</>;
      break;
    case "EVENT_PAVILION":
      heading     = "Event Pavilion Delivery";
      instruction = <>We’ll deliver to the pavilion—please have <strong>{amt}</strong> ready.</>;
      break;
    default:
      heading     = "Order Placed";
      instruction = <>Your order is confirmed. Please have <strong>{amt}</strong> ready.</>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.confirmationCard}>
        <div className={styles.iconWrapper}>
          <svg className={styles.checkIcon} viewBox="0 0 52 52">
            <circle className={styles.checkCircle} cx="26" cy="26" r="25" />
            <path  className={styles.checkMark} d="M14.1 27.2 21.2 34.4 37.9 17.6" />
          </svg>
        </div>

        <h1 className={styles.title}>{heading}</h1>
        <p className={styles.message}>{instruction}</p>

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

        <div className={styles.navigation}>
          <button onClick={() => router.push("/menu")} className="btn secondary">
            View Menu
          </button>
          <button onClick={() => router.push("/")} className="btn secondary">
            Home
          </button>
        </div>

        <p className={styles.note}>
          You’ll receive a confirmation email shortly. Thanks for choosing the 19<sup>th</sup> Hole!
        </p>
      </div>
    </div>
  );
}
