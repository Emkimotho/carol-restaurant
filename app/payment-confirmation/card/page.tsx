// File: app/payment-confirmation/card/page.tsx

"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrderContext } from "@/contexts/OrderContext";
import { CartContext }  from "@/contexts/CartContext";
import styles from "./PaymentConfirmation.module.css";

interface FetchedOrder {
  id:           string;  // database ID
  orderId:      string;  // human-readable code
  totalAmount:  number;
  orderType:    string | null;
  deliveryAddress: {
    street:      string;
    city:        string;
    state:       string;
    zipCode:     string;
    deliveryInstructions?: string;
  } | null;
  status:       string;
  guestEmail:   string | null;
  // add any other fields you need to display
}

export default function CardPaymentConfirmation() {
  const router    = useRouter();
  const params    = useSearchParams();
  const dbId      = params.get("id") ?? "";

  // Context fallback
  const orderCtx  = useContext(OrderContext);
  const cartCtx   = useContext(CartContext);
  if (!orderCtx || !cartCtx) return null;

  const { order: orderFromCtx } = orderCtx;
  const { clearCart }           = cartCtx;

  // State for fetched order
  const [fetchedOrder, setFetchedOrder] = useState<FetchedOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState<boolean>(false);
  const [fetchError, setFetchError]     = useState<string | null>(null);

  // Track whether we sent the email
  const [emailSent, setEmailSent] = useState(false);

  // Restaurant’s pickup address (fallback)
  const restaurantAddress =
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS ||
    "20025 Mount Aetna Road, Hagerstown, MD 21742";

  // 1️⃣ Clear the cart once on mount
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // 2️⃣ Fetch the latest order data by database ID
  useEffect(() => {
    if (!dbId) return;

    setLoadingOrder(true);
    fetch(`/api/orders/${encodeURIComponent(dbId)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Fetch failed: ${res.status}`);
        }
        const data = (await res.json()) as { order: FetchedOrder };
        setFetchedOrder(data.order);
        setLoadingOrder(false);
      })
      .catch((err) => {
        console.error("[PaymentConfirmation] Could not fetch order:", err);
        setFetchError("Failed to load order details.");
        setLoadingOrder(false);
      });
  }, [dbId]);

  // 3️⃣ Send confirmation email once we know the guest email and amount
  useEffect(() => {
    const emailToSend = fetchedOrder?.guestEmail ?? orderFromCtx?.guestEmail;
    const amount      = fetchedOrder?.totalAmount ?? orderFromCtx?.totalAmount ?? 0;
    if (emailSent || !emailToSend) return;

    const humanId = fetchedOrder?.orderId ?? orderFromCtx?.orderId ?? "";
    const subject = "Credit Card Payment Confirmation";
    const text = `Credit card payment of $${amount.toFixed(
      2
    )} received for order #${humanId}.`;
    const html = `<p>Credit card payment of <strong>$${amount.toFixed(
      2
    )}</strong> received for order #${humanId}.</p>`;

    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: emailToSend, subject, text, html }),
    })
      .then((res) => {
        if (res.ok) setEmailSent(true);
        else console.error("[PaymentConfirmation] Email send failed:", res.statusText);
      })
      .catch((err) => console.error("[PaymentConfirmation] Email error:", err));
  }, [emailSent, fetchedOrder, orderFromCtx]);

  // Choose which “order” object to display:
  //  • If fetchedOrder is loaded, use that.
  //  • Otherwise, fall back to context’s order (even if stale).
  const displayOrder = fetchedOrder ?? (orderFromCtx as FetchedOrder | null);

  // Extract fields safely
  const humanOrderId     = displayOrder?.orderId ?? "";
  const totalAmount      = displayOrder?.totalAmount ?? 0;
  const orderType        = displayOrder?.orderType ?? "";
  const deliveryAddress  = displayOrder?.deliveryAddress ?? null;
  const status           = displayOrder?.status ?? "";

  return (
    <div className={styles.container}>
      <div className={styles.confirmationCard}>
        {/* Success Icon */}
        <div className={styles.iconWrapper}>
          <svg className={styles.checkIcon} viewBox="0 0 52 52">
            <circle className={styles.checkCircle} cx="26" cy="26" r="25" />
            <path
              className={styles.checkMark}
              d="M14.1 27.2 21.2 34.4 37.9 17.6"
            />
          </svg>
        </div>

        <h1 className={styles.title}>Payment Confirmed!</h1>

        {loadingOrder ? (
          <p className={styles.message}>Loading order details…</p>
        ) : fetchError ? (
          <p className={styles.message}>
            Your payment succeeded, but we couldn’t load full order details.
          </p>
        ) : (
          <p className={styles.message}>
            Your payment has been successfully processed. Your order is now being prepared.
          </p>
        )}

        {humanOrderId && (
          <p className={styles.orderLine}>
            <strong>Order #</strong> {humanOrderId}
          </p>
        )}

        <p className={styles.currentStatus}>
          <strong>Current status:</strong> {status.replace(/_/g, " ")}
        </p>

        {/* Pickup vs Delivery Details */}
        {orderType.toLowerCase().includes("pickup") ? (
          <div className={styles.detailSection}>
            <h2 className={styles.subtitle}>Pickup Location</h2>
            <p className={styles.address}>
              {restaurantAddress}
              <br />
              Phone: (240) 313-2819
            </p>
          </div>
        ) : (
          <div className={styles.detailSection}>
            <h2 className={styles.subtitle}>Delivery Details</h2>
            {deliveryAddress ? (
              <p className={styles.address}>
                {deliveryAddress.street}, {deliveryAddress.city},{" "}
                {deliveryAddress.state} {deliveryAddress.zipCode}
              </p>
            ) : (
              <p className={styles.address}>
                Your delivery details will be provided shortly.
              </p>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className={styles.navigation}>
          {humanOrderId && (
            <button
              onClick={() => router.push(`/track-delivery/${humanOrderId}`)}
              className={styles.trackButton}
            >
              Track My Order
            </button>
          )}
          <button
            onClick={() => router.push("/menu")}
            className={styles.navButton}
          >
            View Menu
          </button>
          <button
            onClick={() => router.push("/")}
            className={styles.navButton}
          >
            Home
          </button>
        </div>

        <p className={styles.note}>
          A confirmation email {emailSent ? "has been sent" : "will be sent"} to
          you shortly. Thank you for choosing 19<sup>th</sup> Hole!
        </p>
      </div>
    </div>
  );
}
