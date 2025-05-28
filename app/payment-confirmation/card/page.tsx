// File: app/payment-confirmation/card/page.tsx

"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrderContext } from "@/contexts/OrderContext";
import { CartContext }  from "@/contexts/CartContext";
import styles from "./PaymentConfirmation.module.css";

export default function CardPaymentConfirmation() {
  const router    = useRouter();
  const params    = useSearchParams();
  const orderId   = params.get("id") ?? "";

  const orderCtx  = useContext(OrderContext);
  const cartCtx   = useContext(CartContext);
  if (!orderCtx || !cartCtx) return null;

  const { order }       = orderCtx;
  const { clearCart }   = cartCtx;

  const {
    totalAmount   = 0,
    orderType     = "",
    deliveryAddress,
    status        = "",
    guestEmail    = "",
  } = order ?? {};

  const [emailSent, setEmailSent] = useState(false);

  const restaurantAddress =
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS ||
    "20025 Mount Aetna Road, Hagerstown, MD 21742";

  // 1️⃣ Clear the cart once on mount
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // 2️⃣ Send confirmation email once
  useEffect(() => {
    if (emailSent || !guestEmail) return;

    const subject = "Credit Card Payment Confirmation";
    const text = `Credit card payment of $${totalAmount.toFixed(
      2
    )} received for order #${orderId}.`;
    const html = `<p>Credit card payment of <strong>$${totalAmount.toFixed(
      2
    )}</strong> received for order #${orderId}.</p>`;

    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: guestEmail, subject, text, html }),
    })
      .then((res) => {
        if (res.ok) setEmailSent(true);
      })
      .catch((err) => console.error("Email error:", err));
  }, [emailSent, guestEmail, orderId, totalAmount]);

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
        <p className={styles.message}>
          Your payment has been successfully processed. Your order is being
          prepared.
        </p>

        {orderId && (
          <p className={styles.orderLine}>
            <strong>Order #</strong> {orderId}
          </p>
        )}

        <p className={styles.currentStatus}>
          <strong>Current status:</strong> {status.replace(/_/g, " ")}
        </p>

        {/* Pickup vs Delivery Details */}
        {(orderType ?? "").toLowerCase().includes("pickup") ? (
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
          {orderId && (
            <button
              onClick={() => router.push(`/track-delivery/${orderId}`)}
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
