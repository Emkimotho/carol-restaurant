"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import styles from "./PaymentConfirmation.module.css";
import { OrderContext } from "@/contexts/OrderContext";

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PaymentConfirmation: React.FC = () => {
  const { order } = useContext(OrderContext)!;
  const { orderType, deliveryAddress, orderId, items, totalAmount, schedule } = order;
  const customerEmail = (order as any).email;

  // Define restaurant address from environment variable or fallback default.
  const restaurantAddress =
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS ||
    "20025 Mount Aetna Road, Hagerstown, MD 21742";

  // Local state to send the confirmation email only once.
  const [emailSent, setEmailSent] = useState(false);

  // Use SWR to fetch updated order details (e.g., status) every 5 seconds.
  const { data: orderData } = useSWR(
    orderId ? `/api/orders/${orderId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Determine the current order status, with fallback to the context order status.
  const currentStatus = orderData && orderData.status ? orderData.status : order.status;

  // Function to construct email body in both plain text and HTML.
  const constructEmailBody = (): { text: string; html: string } => {
    // Create a text summary of order items.
    const orderItems = items
      .map(
        (item: any) =>
          `${item.title || item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`
      )
      .join("\n");

    // Build order type details with either delivery or pickup information.
    let orderTypeDetails = "";
    if (orderType && orderType.includes("delivery") && deliveryAddress) {
      orderTypeDetails = `
Delivery Address: ${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}
Track your delivery here: https://yourdomain.com/track-delivery
`;
    } else if (orderType && orderType.includes("pickup")) {
      orderTypeDetails = `
Pickup Information:
Please pick up your order at:
${restaurantAddress}
Phone: (240) 313-2819
`;
    }

    const text = `Payment Successful!
Order Confirmation: ${orderId}
Scheduled Time: ${schedule ? new Date(schedule).toLocaleString() : "ASAP"}
Current Order Status: ${currentStatus}
Order Summary:
${orderItems}
Total Amount: $${totalAmount.toFixed(2)}
${orderTypeDetails}

Thank you for your order!
`;

    const html = `
<html>
  <body style="font-family: Montserrat, sans-serif; color: #343a40; line-height: 1.6;">
    <div style="max-width: 600px; margin: auto; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 10px; background: #ffffff;">
      <h1 style="color: #00BF63; font-family: Belleza, sans-serif;">Payment Successful!</h1>
      <p>Thank you for your order.</p>
      <p><strong>Order ID:</strong> ${orderId}</p>
      <p><strong>Scheduled Time:</strong> ${schedule ? new Date(schedule).toLocaleString() : "ASAP"}</p>
      <p><strong>Current Order Status:</strong> ${currentStatus}</p>
      <h3>Order Summary:</h3>
      <ul>
        ${items
          .map(
            (item: any) => `<li>
              <strong>${item.title || item.name}</strong> (x${item.quantity}) - $${(
              item.price * item.quantity
            ).toFixed(2)}
            </li>`
          )
          .join("")}
      </ul>
      <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
      ${
        orderType && orderType.includes("delivery") && deliveryAddress
          ? `<h3>Delivery Details</h3>
      <p>${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}</p>
      <p>Track your delivery <a href="https://yourdomain.com/track-delivery">here</a>.</p>`
          : `<h3>Pickup Information</h3>
      <p>Please pick up your order at:<br/>${restaurantAddress}<br/>Phone: (240) 313-2819</p>`
      }
      <p>We appreciate your business and hope you enjoy your meal. If you have any questions, feel free to contact us at <a href="tel:(240)313-2819">(240) 313-2819</a>.</p>
      <p>Best regards,<br/>Your Restaurant Team</p>
    </div>
  </body>
</html>
`;

    return { text, html };
  };

  // Trigger sending the confirmation email once when the component mounts, if not sent already.
  useEffect(() => {
    if (!emailSent && customerEmail) {
      const { text, html } = constructEmailBody();
      const subject = `Order Confirmation - ${orderId}`;
      fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: customerEmail, subject, text, html }),
      })
        .then((res) => {
          if (res.ok) {
            setEmailSent(true);
          }
        })
        .catch((err) => console.error("Error sending email via API:", err));
    }
  }, [
    customerEmail,
    emailSent,
    orderId,
    items,
    totalAmount,
    schedule,
    orderType,
    deliveryAddress,
    restaurantAddress,
    currentStatus,
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.confirmationCard}>
        <div className={styles.iconWrapper}>
          <svg
            className={styles.checkIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 52 52"
          >
            <circle className={styles.checkCircle} cx="26" cy="26" r="25" fill="none" />
            <path className={styles.checkMark} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
          </svg>
        </div>
        <h1 className={styles.title}>Payment Successful!</h1>
        <p className={styles.message}>Thank you for your order.</p>
        <p className={styles.currentStatus}>
          <strong>Current Order Status:</strong> {currentStatus}
        </p>
        {orderType === "pickup" ? (
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
              <>
                <p className={styles.address}>
                  {deliveryAddress.street}, {deliveryAddress.city},{" "}
                  {deliveryAddress.state} {deliveryAddress.zipCode}
                </p>
                <Link href="/track-delivery">
                  <button className={styles.trackButton}>Track Delivery</button>
                </Link>
              </>
            ) : (
              <p className={styles.address}>
                Your delivery details will be provided shortly.
              </p>
            )}
          </div>
        )}
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
};

export default PaymentConfirmation;
