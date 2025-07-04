// File: components/payment-confirmation/CardPaymentConfirmation.tsx
/* =======================================================================
   Credit-Card Payment Confirmation + Live-Tracking Link
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
  paymentMethod:"CARD" | "CASH";
  orderType:    string | null;
  deliveryType: DeliveryType;
  holeNumber?:  number | null;
  deliveryAddress: {
    street:  string;
    city:    string;
    state:   string;
    zipCode: string;
    deliveryInstructions?: string;
  } | null;
  status:     string;
  guestEmail: string | null;
  createdAt:  string;  // ISO
}

/* ────────────────────────── Helpers ───────────────────────────── */
const money = (n: number) => `$${n.toFixed(2)}`;
const etClock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });

/* ================================================================= */
export default function CardPaymentConfirmation() {
  const router  = useRouter();
  const params  = useSearchParams();
  const dbId    = params.get("id") ?? "";

  /* ----------------------------------------------------------------
     Order & cart contexts
  ---------------------------------------------------------------- */
  const orderCtx = useContext(OrderContext);
  const cartCtx  = useContext(CartContext);
  if (!orderCtx || !cartCtx) return null;

  const { order: ctxOrder } = orderCtx;
  const { clearCart }       = cartCtx;

  /* ----------------------------------------------------------------
     Local state
  ---------------------------------------------------------------- */
  const [dbOrder, setDbOrder] = useState<FetchedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg,  setErrMsg]  = useState<string | null>(null);
  const [emailOK, setEmailOK] = useState(false);

  const restaurantAddress =
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS ??
    "20025 Mount Aetna Road, Hagerstown, MD 21742";

  /* ----------------------------------------------------------------
     1. Clear cart exactly once after a successful payment
  ---------------------------------------------------------------- */
  useEffect(clearCart, [clearCart]);

  /* ----------------------------------------------------------------
     2. Fetch order from DB
  ---------------------------------------------------------------- */
  useEffect(() => {
    if (!dbId) return;
    setLoading(true);
    fetch(`/api/orders/${encodeURIComponent(dbId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const { order } = await r.json();
        setDbOrder(order);
      })
      .catch(() => setErrMsg("Couldn’t load order details."))
      .finally(() => setLoading(false));
  }, [dbId]);

  /* ----------------------------------------------------------------
     3. Send email receipt once, when guestEmail is present
  ---------------------------------------------------------------- */
  useEffect(() => {
    const target = dbOrder?.guestEmail ?? ctxOrder.guestEmail;
    if (!target || emailOK) return;

    const humanId = dbOrder?.orderId  ?? ctxOrder.orderId;
    const amount  = dbOrder?.totalAmount ?? ctxOrder.totalAmount ?? 0;

    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to:      target,
        subject: "19th Hole — Payment Confirmation",
        text:    `Your card payment of ${money(amount)} for order #${humanId} has been received.`,
        html:    `<p>Your card payment of <strong>${money(amount)}</strong> for order #${humanId} has been received.</p>`,
      }),
    })
      .then((r) => r.ok && setEmailOK(true))
      .catch(console.error);
  }, [dbOrder, ctxOrder, emailOK]);

  /* ----------------------------------------------------------------
     4. Snapshot: prefer fresh DB record, fall back to context
  ---------------------------------------------------------------- */
  const snap = (dbOrder ?? ctxOrder) as Partial<FetchedOrder>;

  const {
    orderId       = "",
    totalAmount   = 0,
    paymentMethod = "CARD",
    status        = "",
    orderType     = "",
    deliveryType  = "PICKUP_AT_CLUBHOUSE",
    holeNumber,
    deliveryAddress,
  } = snap;

  const placedClock =
    dbOrder?.createdAt ? etClock(dbOrder.createdAt) : undefined;

  /* ----------------------------------------------------------------
     5. Human-readable labels & instructions
  ---------------------------------------------------------------- */
  const label = getDeliveryLabel(
    deliveryType as DeliveryType,
    holeNumber
  );

  let instruction: React.ReactNode;
  if (deliveryType === "ON_COURSE") {
    instruction =
      holeNumber != null ? (
        <>
          We’ll bring your order to hole&nbsp;
          <strong>{holeNumber}</strong> — please have{" "}
          <strong>{money(totalAmount)}</strong> ready.
        </>
      ) : (
        <>
          We’ll bring your order straight to your hole — please have{" "}
          <strong>{money(totalAmount)}</strong> ready.
        </>
      );
  } else if (
    deliveryType === "DELIVERY" ||
    orderType?.toLowerCase().includes("delivery")
  ) {
    instruction = deliveryAddress ? (
      <>
        We’ll deliver to your address — please have{" "}
        <strong>{money(totalAmount)}</strong> ready.
      </>
    ) : (
      <>Address will appear once a driver is assigned.</>
    );
  } else {
    instruction = (
      <>
        Please pick up your order at the clubhouse and have{" "}
        <strong>{money(totalAmount)}</strong> ready.
      </>
    );
  }

  /* =================================================================
     Render
  ================================================================= */
  return (
    <div className={styles.container}>
      <div className={styles.confirmationCard}>
        {/* ✔️ Icon */}
        <div className={styles.iconWrapper}>
          <svg className={styles.checkIcon} viewBox="0 0 52 52">
            <circle className={styles.checkCircle} cx="26" cy="26" r="25" />
            <path   className={styles.checkMark}  d="M14.1 27.2 21.2 34.4 37.9 17.6" />
          </svg>
        </div>

        <h1 className={styles.title}>Payment Confirmed!</h1>

        {/* Loading / error / success banner */}
        {loading && <p className={styles.message}>Fetching order details…</p>}

        {errMsg && (
          <p className={styles.message}>
            Payment succeeded, but we couldn’t load full details.&nbsp;
            <button
              onClick={() => {
                setErrMsg(null);
                setDbOrder(null);
                setLoading(false);
              }}
              className={styles.retryBtn}
            >
              retry
            </button>
          </p>
        )}

        {!loading && !errMsg && (
          <p className={styles.message}>
            Your card was charged {money(totalAmount)} — thank you!
          </p>
        )}

        {/* Order number */}
        {orderId && (
          <div className={styles.orderNumberRow}>
            <span className={styles.factLabel}>Order #</span>
            <span className={styles.orderNumber}>{orderId}</span>
          </div>
        )}

        {/* Paid / placed */}
        <div className={styles.paidPlacedRow}>
          <div>
            <span className={styles.factLabel}>Paid with</span>
            <span>{paymentMethod === "CARD" ? "Card" : paymentMethod}</span>
          </div>
          {placedClock && (
            <div>
              <span className={styles.factLabel}>Placed</span>
              <span>{placedClock}</span>
            </div>
          )}
        </div>

        {/* Current status */}
        <div className={styles.statusRow}>
          <span className={styles.factLabel}>Status</span>
          <span>{status.replace(/_/g, " ")}</span>
        </div>

        {/* Delivery / pickup details */}
        <div className={styles.detailSection}>
          <h2 className={styles.subtitle}>{label}</h2>
          <p className={styles.address}>{instruction}</p>
          {deliveryType === "PICKUP_AT_CLUBHOUSE" && (
            <p className={styles.address}>{restaurantAddress}</p>
          )}
        </div>

        {/* Navigation buttons */}
        {orderId && (
          <div className={styles.navigation}>
            <button
              onClick={() => router.push(`/track-delivery/${orderId}`)}
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
          {emailOK
            ? "A confirmation email has been sent to you. Enjoy the 19"
            : "A confirmation email will be sent to you shortly. Enjoy the 19"}
          <sup>th</sup> Hole!
        </p>
      </div>
    </div>
  );
}
