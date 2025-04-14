// File: components/DeliveryTracking.tsx
"use client";

import React, { useContext } from "react";
import useSWR from "swr";
import Link from "next/link";
import styles from "./DeliveryTracking.module.css";
import { OrderContext } from "@/contexts/OrderContext";

// Define the steps for the tracking process.
interface Step {
  label: string;
  icon: string;
}

const steps: Step[] = [
  { label: "Order Received", icon: "📩" },
  { label: "In Progress", icon: "👨‍🍳" },
  { label: "Order Ready", icon: "🍽️" },
  { label: "Picked Up by Driver", icon: "👨‍✈️" },
  { label: "On the Way", icon: "🚗" },
  { label: "Delivered", icon: "🏠" },
];

// A simple fetcher function for SWR.
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DeliveryTracking() {
  // Get the order from context.
  const { order } = useContext(OrderContext)!;
  const orderId = order.orderId; // Assume this is your internal ID for the order.

  // Use SWR to fetch order details from the API, polling every 5 seconds.
  const { data: orderData, error } = useSWR(
    orderId ? `/api/orders/${orderId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Map backend order status to the step index.
  const statusToStep: { [key: string]: number } = {
    ORDER_RECEIVED: 0,
    IN_PROGRESS: 1,
    ORDER_READY: 2,
    PICKED_UP_BY_DRIVER: 3,
    ON_THE_WAY: 4,
    DELIVERED: 5,
  };

  // Get the current step; fallback to 0 if data is not loaded.
  const currentStep =
    orderData && orderData.status ? statusToStep[orderData.status] ?? 0 : 0;

  if (error) return <div>Error loading order tracking info.</div>;
  if (!orderData) return <div>Loading tracking info...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.trackingCard}>
        <h1 className={styles.title}>Delivery Tracking</h1>
        {orderId && <p className={styles.orderId}>Order ID: {orderId}</p>}
        <div className={styles.progressBar}>
          {steps.map((step, index) => (
            <div key={index} className={styles.stepContainer}>
              <div
                className={`${styles.circle} ${
                  index <= currentStep ? styles.active : ""
                }`}
              >
                <span className={styles.icon}>{step.icon}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`${styles.line} ${
                    index < currentStep ? styles.active : ""
                  }`}
                ></div>
              )}
              <div className={styles.labelContainer}>
                <span className={styles.stepLabel}>{step.label}</span>
              </div>
            </div>
          ))}
        </div>
        <p className={styles.statusMessage}>
          {currentStep < steps.length - 1
            ? `Your order status is ${steps[currentStep].label.toLowerCase()}...`
            : "Your order has been delivered! Enjoy your meal."}
        </p>
        <div className={styles.contact}>
          <p>
            If you have any questions, please call{" "}
            <strong>(240) 313-2819</strong>.
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
