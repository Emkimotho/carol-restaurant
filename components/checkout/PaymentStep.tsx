// File: app/checkout/PaymentStep.tsx
"use client";

import React, { useState, useContext, ChangeEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/checkout/PaymentStep.module.css";
import { CartContext } from "@/contexts/CartContext";
import { OrderContext, Order } from "@/contexts/OrderContext";

interface PaymentStepProps {
  orderId?: string | null;
  items?: { cloverItemId: string; quantity: number }[];
  totalAmount?: number;
  orderType: string;
  isSameAddress: boolean;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  onBillingAddressChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSameAddressChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PaymentStep: React.FC<PaymentStepProps> = (props) => {
  const {
    orderId: propOrderId,
    items: propItems,
    totalAmount: propTotalAmount,
    orderType,
    isSameAddress,
    billingAddress,
    deliveryAddress,
    onBillingAddressChange,
    onSameAddressChange,
    onNext,
    onBack,
  } = props;

  const router = useRouter();
  const { clearCart } = useContext(CartContext)!;
  const { order, setOrder } = useContext(OrderContext)!;

  // Determine effective values: use props first, then context.
  const effectiveOrderId = propOrderId ?? order.orderId;
  const effectiveItems = propItems ?? order.items;
  const effectiveTotalAmount =
    typeof propTotalAmount === "number" ? propTotalAmount : order.totalAmount;

  useEffect(() => {
    console.log("PaymentStep: effectiveOrderId =", effectiveOrderId);
    console.log("PaymentStep: effectiveItems =", effectiveItems);
    console.log("PaymentStep: effectiveTotalAmount =", effectiveTotalAmount);
  }, [effectiveOrderId, effectiveItems, effectiveTotalAmount]);

  // Handle customer name and address.
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  useEffect(() => {
    if (orderType.includes("delivery") && deliveryAddress) {
      const { street, city, state, zipCode } = deliveryAddress;
      setCustomerAddress(`${street}, ${city}, ${state} ${zipCode}`);
    } else if (billingAddress) {
      const { street, city, state, zipCode } = billingAddress;
      setCustomerAddress(`${street}, ${city}, ${state} ${zipCode}`);
    }
  }, [orderType, deliveryAddress, billingAddress]);

  // Function to create the order in the database if not already created.
  const createOrderInDB = async (): Promise<Order> => {
    const payload = {
      customerId: "", // Adjust as needed.
      items: effectiveItems,
      totalAmount: effectiveTotalAmount,
      // Optionally include orderType or other details.
    };

    console.log("PaymentStep: Creating order in DB with payload:", payload);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create order in DB");
    const newOrder: Order = await res.json();
    console.log("PaymentStep: Order created in DB:", newOrder);
    // Update the context with the returned DB id.
    setOrder((prev) => ({ ...prev, dbId: newOrder.id }));
    return newOrder;
  };

  // Payment logic.
  const [loading, setLoading] = useState(false);

  const handleMakePayment = async () => {
    if (!effectiveOrderId) {
      alert("Order ID is missing. Please retry or start a new order.");
      return;
    }
    if (!effectiveItems || effectiveItems.length === 0) {
      alert("Your cart is empty. Please add items before checking out.");
      return;
    }
    if (typeof effectiveTotalAmount !== "number" || effectiveTotalAmount < 0) {
      alert("Invalid total amount. Please review your order.");
      return;
    }

    setLoading(true);
    try {
      // First, ensure the order record exists in the database.
      const createdOrder = await createOrderInDB();

      // Then, prepare payload for payment (Clover) API.
      const payload = {
        orderId: effectiveOrderId, // human-friendly id from context
        dbId: createdOrder.id,      // the database id returned
        items: effectiveItems,
        totalAmount: effectiveTotalAmount,
        customerName,
        customerAddress,
      };
      console.log("PaymentStep: Sending payload to /api/clover/payment:", payload);

      const res = await fetch("/api/clover/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("PaymentStep: Response from payment API:", data);

      if (data.checkoutUrl) {
        clearCart();
        window.location.href = data.checkoutUrl;
      } else {
        alert("Error initiating payment session: " + JSON.stringify(data));
      }
    } catch (error) {
      console.error("PaymentStep: Payment processing error:", error);
      alert("An error occurred while processing payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.checkoutSection}>
      <h4>Payment Details</h4>
      <div style={{ marginBottom: "1rem" }}>
        <label htmlFor="customerName">Your Name:</label>
        <input
          id="customerName"
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="John Doe"
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </div>
      <p>
        <strong>Order Type:</strong> {orderType}
      </p>
      <p>
        <strong>Billing Same as Delivery:</strong>{" "}
        {isSameAddress ? "Yes" : "No"}
      </p>
      <div>
        <h5>Billing Address:</h5>
        <input
          type="text"
          name="street"
          value={billingAddress.street}
          onChange={onBillingAddressChange}
          placeholder="Street"
        />
        <input
          type="text"
          name="city"
          value={billingAddress.city}
          onChange={onBillingAddressChange}
          placeholder="City"
        />
        <input
          type="text"
          name="state"
          value={billingAddress.state}
          onChange={onBillingAddressChange}
          placeholder="State"
        />
        <input
          type="text"
          name="zipCode"
          value={billingAddress.zipCode}
          onChange={onBillingAddressChange}
          placeholder="ZipCode"
        />
        <div>
          <input
            type="checkbox"
            checked={isSameAddress}
            onChange={onSameAddressChange}
          />
          <label>Same as Delivery Address</label>
        </div>
      </div>
      <div className={styles.navigationButtons}>
        <button
          onClick={onBack}
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSweepWave}`}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
        >
          Next
        </button>
        <button
          onClick={handleMakePayment}
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
          disabled={loading}
        >
          {loading ? "Processing..." : "Make Payment"}
        </button>
      </div>
    </div>
  );
};

export default PaymentStep;
