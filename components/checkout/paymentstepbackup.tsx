// File: app/payment-step/page.tsx
"use client";

import React, { useContext, useState, useEffect } from "react";
import { OrderContext } from "@/contexts/OrderContext";
import { useRouter } from "next/navigation";
import styles from "./PaymentStep.module.css";
import { toast } from "react-toastify";

// Payment step where cash is selected but no API call to Clover immediately
const PaymentStep: React.FC = () => {
  const { order, setOrder } = useContext(OrderContext)!;
  const [isCash, setIsCash] = useState(order.paymentMethod === "CASH");
  const [cashAmount, setCashAmount] = useState(order.totalAmount);
  const [billingAddress, setBillingAddress] = useState(order.deliveryAddress);
  const [isBillingSameAsDelivery, setIsBillingSameAsDelivery] = useState(true);
  const router = useRouter();

  // Handle payment method change (Cash/Card)
  const handlePaymentMethodChange = (method: "CASH" | "CARD") => {
    setIsCash(method === "CASH");
    setOrder((prev) => ({
      ...prev,
      paymentMethod: method,
    }));
  };

  // Handle confirm button click for cash or card
  const handleConfirm = async () => {
    if (isCash) {
      // Register cash payment (Do not trigger Clover API yet)
      setOrder((prev) => ({
        ...prev,
        paymentMethod: "CASH", // Mark the order as cash payment
      }));
      toast.success("Cash payment method selected");
      router.push("/payment-confirmation/cash"); // Redirect to confirmation page for cash
    } else {
      // Handle card payment: Trigger the Clover API and process the payment
      try {
        // Trigger Clover API to create a payment session (Modify this logic as needed)
        const paymentResponse = await fetch("/api/orders/payment", {
          method: "POST",
          body: JSON.stringify({
            orderId: order.orderId,
            totalAmount: order.totalAmount,
            paymentMethod: "CARD",
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!paymentResponse.ok) {
          throw new Error("Payment processing failed");
        }

        toast.success("Card payment method selected");
        router.push("/payment-confirmation/card"); // Redirect to confirmation page for card
      } catch (error) {
        toast.error("There was an issue processing your card payment. Please try again.");
        console.error(error);
      }
    }
  };

  // Effect for checking if the billing address is same as delivery
  useEffect(() => {
    if (order.deliveryAddress) {
      setBillingAddress(order.deliveryAddress);
    }
  }, [order.deliveryAddress]);

  // Toggle for Billing Address
  const toggleBillingAddress = () => {
    setIsBillingSameAsDelivery(!isBillingSameAsDelivery);
    if (isBillingSameAsDelivery) {
      // If billing is different, clear the billing address fields
      setBillingAddress({
        street: "",
        aptSuite: "",
        city: "",
        state: "",
        zipCode: "",
        deliveryOption: "",
        deliveryInstructions: "",
      });
    } else {
      // If billing is the same, reset to delivery address
      setBillingAddress(order.deliveryAddress);
    }
  };

  return (
    <div className={styles.checkoutSection}>
      <h4>Payment Method</h4>

      {/* Payment Method Selection */}
      <div className={styles.paymentOptions}>
        <label>
          <input
            type="radio"
            name="paymentMethod"
            value="CARD"
            checked={!isCash}
            onChange={() => handlePaymentMethodChange("CARD")}
          />
          Card
        </label>
        <label>
          <input
            type="radio"
            name="paymentMethod"
            value="CASH"
            checked={isCash}
            onChange={() => handlePaymentMethodChange("CASH")}
          />
          Cash
        </label>
      </div>

      {/* If Cash is selected, show cash amount input */}
      {isCash && (
        <div className={styles.cashAmountInput}>
          <label htmlFor="cashAmount">Cash Amount</label>
          <input
            id="cashAmount"
            type="number"
            value={cashAmount}
            onChange={(e) => setCashAmount(parseFloat(e.target.value))}
            min="0"
            step="0.01"
          />
        </div>
      )}

      {/* Billing Address Toggle */}
      <div className={styles.billingAddressToggle}>
        <label>
          <input
            type="checkbox"
            checked={isBillingSameAsDelivery}
            onChange={toggleBillingAddress}
          />
          Use Delivery Address as Billing Address
        </label>
      </div>

      {/* Billing Address Form (only when different from delivery address) */}
      {!isBillingSameAsDelivery && (
        <div className={styles.billingAddressForm}>
          <label htmlFor="billingStreet">Street</label>
          <input
            id="billingStreet"
            type="text"
            value={billingAddress.street}
            onChange={(e) => setBillingAddress({ ...billingAddress, street: e.target.value })}
          />

          <label htmlFor="billingCity">City</label>
          <input
            id="billingCity"
            type="text"
            value={billingAddress.city}
            onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
          />

          <label htmlFor="billingState">State</label>
          <input
            id="billingState"
            type="text"
            value={billingAddress.state}
            onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
          />

          <label htmlFor="billingZip">Zip Code</label>
          <input
            id="billingZip"
            type="text"
            value={billingAddress.zipCode}
            onChange={(e) => setBillingAddress({ ...billingAddress, zipCode: e.target.value })}
          />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className={styles.navigationButtons}>
        <button
          onClick={() => router.back()}
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          Confirm Payment
        </button>
      </div>
    </div>
  );
};

export default PaymentStep;
