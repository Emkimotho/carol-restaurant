"use client";

import React, { useContext } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/checkout/Checkout.module.css";
import { OrderContext } from "@/contexts/OrderContext";
import { useOpeningHours } from "@/contexts/OpeningHoursContext";
import {
  calculateTipAmount,
  calculateTaxAmount,
  calculateTotalWithTipAndTax,
} from "@/utils/checkoutUtils";

export interface OrderSummaryProps {
  cartItems: any[];
  getTotalPrice: () => number;
  orderType: string;
  deliveryFee: number;
  tip: string;
  customTip: string;
  onTipChange: (value: string) => void;
  onCustomTipChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  taxRate: number;
  onNext: () => void;
  onBack: () => void;
}

/**
 * OrderSummaryStep displays the complete order summary:
 * - It shows cart items with details and a cost breakdown.
 * - It displays order type and scheduled time (if provided).
 * - It provides tip selection options and displays the final total.
 *
 * When the user clicks Next, the component validates whether:
 * - The restaurant is open, OR
 * - A scheduled time is provided.
 *
 * If neither is true, the user is redirected to the schedule order page with a return URL.
 */
const OrderSummaryStep: React.FC<OrderSummaryProps> = ({
  cartItems,
  getTotalPrice,
  orderType,
  deliveryFee,
  tip,
  customTip,
  onTipChange,
  onCustomTipChange,
  taxRate,
  onNext,
  onBack,
}) => {
  const { order } = useContext(OrderContext)!;
  const { schedule } = order;
  const router = useRouter();
  const { isOpen } = useOpeningHours();

  // Calculate cost breakdown.
  const subtotal = getTotalPrice();
  const tipAmount = calculateTipAmount(subtotal, tip, customTip);
  const taxAmount = calculateTaxAmount(subtotal, taxRate);
  const total = calculateTotalWithTipAndTax(subtotal, tipAmount, taxAmount, deliveryFee);

  /**
   * Returns a friendly label for the order type.
   */
  const getOrderTypeLabel = () => {
    switch (orderType) {
      case "pickup":
        return "Pickup";
      case "delivery":
        return "Delivery";
      case "instant_pickup":
        return "Pickup (Immediate)";
      case "instant_delivery":
        return "Delivery (Immediate)";
      case "scheduled_pickup":
        return "Pickup (Scheduled)";
      case "scheduled_delivery":
        return "Delivery (Scheduled)";
      default:
        return "Not specified";
    }
  };

  /**
   * Format the schedule if available; otherwise assume an instant order.
   */
  const getScheduleLabel = () => {
    if (schedule) {
      const dateObj = new Date(schedule);
      return dateObj.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return "Instant Order (ASAP)";
  };

  /**
   * Final validation check when proceeding to the next step.
   * If the restaurant is closed and no schedule is set, alert the user and redirect
   * to the schedule order page with a return URL to come back to this summary.
   */
  const handleNext = () => {
    if (!schedule && !isOpen) {
      alert("The restaurant is currently closed. Please schedule your order.");
      router.push("/schedule-order?returnUrl=/checkout/summary");
      return;
    }
    onNext();
  };

  return (
    <div className={styles.checkoutSection}>
      <h4>Order Summary</h4>

      <div className={styles.orderSummary}>
        {cartItems.map((item, index) => (
          <div key={index} className={styles.orderItem}>
            <h5>{(item.title || item.name) + ` x ${item.quantity}`}</h5>
            {item.description && <p>{item.description}</p>}
            {item.spiceLevel && <p>Spice Level: {item.spiceLevel}</p>}
            {item.specialInstructions && <p>Note: {item.specialInstructions}</p>}
            {item.selectedAccompaniments &&
              Object.keys(item.selectedAccompaniments).length > 0 && (
                <div className={styles.accompaniments}>
                  <h6>Accompaniments:</h6>
                  {Object.entries(item.selectedAccompaniments).map(
                    ([groupName, accompaniments]: [string, any]) => (
                      <div key={groupName} className={styles.accompanimentGroup}>
                        <strong>{groupName}:</strong>{" "}
                        {accompaniments.map((acc: any, idx: number) => (
                          <span key={idx}>
                            {acc.name}
                            {idx < accompaniments.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            <p>${(item.price * item.quantity).toFixed(2)}</p>
          </div>
        ))}

        <hr />

        <div className={styles.orderTotal}>
          <h5>Subtotal:</h5>
          <p>${subtotal.toFixed(2)}</p>
        </div>

        {orderType && orderType.includes("delivery") && (
          <div className={styles.orderTotal}>
            <h5>Delivery Fee:</h5>
            <p>${deliveryFee.toFixed(2)}</p>
          </div>
        )}

        <div className={styles.orderTotal}>
          <h5>Order Type:</h5>
          <p>{getOrderTypeLabel()}</p>
        </div>

        <div className={styles.orderTotal}>
          <h5>Scheduled Time:</h5>
          <p>{getScheduleLabel()}</p>
        </div>
      </div>

      {/* Tip Selection Section */}
      <div className={`${styles.tipSelection} mt-4`}>
        <h5>Add a Tip?</h5>
        <div className={styles.tipOptions}>
          <button
            className={`${styles.btn} ${
              tip === "0" ? styles.btnPrimary : styles.btnOutlinePrimary
            }`}
            onClick={() => onTipChange("0")}
          >
            No Tip
          </button>
          <button
            className={`${styles.btn} ${
              tip === "10" ? styles.btnPrimary : styles.btnOutlinePrimary
            }`}
            onClick={() => onTipChange("10")}
          >
            10%
          </button>
          <button
            className={`${styles.btn} ${
              tip === "15" ? styles.btnPrimary : styles.btnOutlinePrimary
            }`}
            onClick={() => onTipChange("15")}
          >
            15%
          </button>
          <button
            className={`${styles.btn} ${
              tip === "20" ? styles.btnPrimary : styles.btnOutlinePrimary
            }`}
            onClick={() => onTipChange("20")}
          >
            20%
          </button>
          <button
            className={`${styles.btn} ${
              tip === "custom" ? styles.btnPrimary : styles.btnOutlinePrimary
            }`}
            onClick={() => onTipChange("custom")}
          >
            Custom
          </button>
        </div>
        {tip === "custom" && (
          <div className={`${styles.formGroup} mt-3`}>
            <label htmlFor="customTip">Custom Tip Amount</label>
            <input
              type="number"
              name="customTip"
              id="customTip"
              value={customTip}
              onChange={onCustomTipChange}
              className={styles.formControl}
              min="0"
            />
          </div>
        )}
      </div>

      {/* Final Totals Section */}
      <div className={`${styles.orderTotal} mt-4`}>
        <h5>Tip Amount:</h5>
        <p>${tipAmount.toFixed(2)}</p>
        <h5>Tax ({(taxRate * 100).toFixed(2)}%):</h5>
        <p>${taxAmount.toFixed(2)}</p>
        <hr />
        <h5 style={{ fontWeight: "bold", color: "#000" }}>Total:</h5>
        <p style={{ fontWeight: "bold", color: "#000" }}>
          ${parseFloat(total).toFixed(2)}
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className={styles.navigationButtons}>
        <button
          onClick={onBack}
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSweepWave}`}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default OrderSummaryStep;
