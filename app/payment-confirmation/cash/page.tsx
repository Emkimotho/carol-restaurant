// File: app/payment-confirmation/cash/page.tsx

"use client";

import React, { useContext, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { OrderContext } from "@/contexts/OrderContext";
import styles from "./PaymentConfirmation.module.css";
import { fetchCloverItems } from "@/lib/clover";  // For Clover item fetching, if required for other logic

export default function CashPaymentConfirmation() {
  const { order } = useContext(OrderContext)!;
  const { items, totalAmount, orderType, deliveryAddress, status } = order;
  const params = useSearchParams();
  const orderId = params.get("id");
  
  const [sent, setSent] = useState(false);

  const restaurantAddress = process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS || "20025 Mount Aetna Road, Hagerstown, MD 21742";

  useEffect(() => {
    if (!sent) {
      const email = order.guestEmail;  // Ensure you get the correct customer email
      const subject = "Cash Payment Confirmation";
      const text = `Cash payment of $${totalAmount} received for order #${orderId}.`;
      const html = `<p>Cash payment of <strong>$${totalAmount}</strong> received for order #${orderId}.</p>`;

      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject,
          text,
          html,
        }),
      })
        .then((res) => res.ok && setSent(true))
        .catch((e) => console.error("email error:", e));
    }
  }, [sent, orderId, totalAmount, order.guestEmail]);

  return (
    <div className={styles.container}>
      <div className={styles.confirmationCard}>
        {/* Success Icon */}
        <div className={styles.iconWrapper}>
          <svg className={styles.checkIcon} viewBox="0 0 52 52">
            <circle className={styles.checkCircle} cx="26" cy="26" r="25" />
            <path className={styles.checkMark} d="M14.1 27.2 21.2 34.4 37.9 17.6" />
          </svg>
        </div>

        <h1 className={styles.title}>Cash Payment Received!</h1>
        <p className={styles.message}>
          Thank you for your payment. Your order is being processed.
        </p>

        {orderId && (
          <p className={styles.orderLine}>
            <strong>Order #</strong> {orderId}
          </p>
        )}

        <p className={styles.currentStatus}>
          <strong>Current status:</strong> {status.replace(/_/g, " ")}
        </p>

        {/* Delivery or Pickup Details */}
        {orderType?.includes("pickup") ? (
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
                {deliveryAddress.street}, {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zipCode}
              </p>
            ) : (
              <p className={styles.address}>
                Your delivery details will be provided shortly.
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.navigation}>
          {/* Track My Order */}
          <button
            onClick={() => window.location.href = `/track-delivery/${orderId}`}
            className={styles.trackButton}
          >
            Track My Order
          </button>
          {/* View Menu */}
          <button
            onClick={() => window.location.href = "/menu"}
            className={styles.navButton}
          >
            View Menu
          </button>
          {/* Home */}
          <button
            onClick={() => window.location.href = "/"}
            className={styles.navButton}
          >
            Home
          </button>
        </div>

        <p className={styles.note}>
          A confirmation e-mail {sent ? "has been sent" : "will be sent"} to you soon.
          Thanks for choosing 19<sup>th</sup> Hole!
        </p>
      </div>
    </div>
  );
}
