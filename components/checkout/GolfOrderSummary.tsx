// File: components/checkout/GolfOrderSummary.tsx
//
// Renders the order summary for golf & mixed-menu orders.
// • Shows customer name.
// • Lists each line item with title, quantity, description, spice level,
//   special instructions, and option selections.
// • Displays golf delivery label: “Clubhouse Pick-up”, “On-Course • Hole X”,
//   or “Event Pavilion”.
// • Defaults schedule to ASAP on first mount (no scheduling UI here).
// • Tip selection (0 %, 10 %, 15 %, 20 %, or custom).
// • If containsAlcohol ➜ shows age-verification checkbox.
// • Calculates & shows subtotal, tip, tax, and grand total.
// • On “Next”, writes items, totals, and alcohol flags into OrderContext.

"use client";

import React, { useContext, useEffect, useState } from "react";
import styles from "./OrderSummaryStep.module.css";

import { OrderContext } from "@/contexts/OrderContext";
import { CartItem, OrderSummaryStepProps } from "@/utils/types";
import {
  calculateTipAmount,
  calculateTaxAmount,
  calculateTotalWithTipAndTax,
} from "@/utils/checkoutUtils";
import { TAX_RATE } from "@/config/taxConfig";
import { DeliveryType } from "@prisma/client";

/* ------------------------------------------------------------------ */
/*  Helper: price of a single cart item                               */
/* ------------------------------------------------------------------ */
const priceOf = (item: CartItem): number => {
  let extras = 0;

  if (item.optionGroups && item.selectedOptions) {
    item.optionGroups.forEach(group => {
      const state = item.selectedOptions?.[group.id];
      if (!state) return;

      group.choices.forEach(choice => {
        if (!state.selectedChoiceIds.includes(choice.id)) return;

        if (!choice.nestedOptionGroup) {
          extras += choice.priceAdjustment ?? 0;
        } else {
          const nestedSel = state.nestedSelections?.[choice.id] ?? [];
          choice.nestedOptionGroup.choices.forEach(nested => {
            if (nestedSel.includes(nested.id)) {
              extras += nested.priceAdjustment ?? 0;
            }
          });
        }
      });
    });
  }

  return (item.price + extras) * item.quantity;
};

/* =================================================================== */
/*                          Component                                  */
/* =================================================================== */
export default function GolfOrderSummary({
  cartItems,
  tip,
  customTip,
  onTipChange,
  onCustomTipChange,
  onBack,
  onNext,
  taxRate,
  containsAlcohol,
}: OrderSummaryStepProps & { containsAlcohol: boolean }) {
  const { order, setOrder } = useContext(OrderContext)!;
  const [ageConfirmed, setAgeConfirmed] = useState(order.ageVerified);

  /* ---------- default schedule to “now” (ASAP) -------------------- */
  useEffect(() => {
    if (!order.schedule) {
      setOrder(prev => ({ ...prev, schedule: new Date().toISOString() }));
    }
  }, [order.schedule, setOrder]);

  /* ---------- money math ------------------------------------------ */
  const subtotal = cartItems.reduce((sum, it) => sum + priceOf(it), 0);
  const tipAmt   = calculateTipAmount(subtotal, tip, customTip);
  const rate     = typeof taxRate === "number" ? taxRate : TAX_RATE;
  const taxAmt   = calculateTaxAmount(subtotal, rate);
  const rawTotal = calculateTotalWithTipAndTax(subtotal, tipAmt, taxAmt, 0);
  const total    = typeof rawTotal === "string" ? parseFloat(rawTotal) : rawTotal;

  /* ---------- labels ---------------------------------------------- */
  const displayName = order.customerId && order.customerName
    ? order.customerName
    : order.guestName;

  const golfLabel = (): string => {
    switch (order.deliveryType) {
      case DeliveryType.PICKUP_AT_CLUBHOUSE:
        return "Clubhouse Pick-up";
      case DeliveryType.ON_COURSE: {
        const hole = order.holeNumber ? `Hole ${order.holeNumber}` : "Hole ?";
        return `On-Course • ${hole}`;
      }
      case DeliveryType.EVENT_PAVILION:
        return "Event Pavilion";
      case DeliveryType.DELIVERY:
        return "Delivery";
      default:
        return "Golf Order";
    }
  };

  /* ---------- proceed handler ------------------------------------- */
  const proceed = () => {
    setOrder(prev => ({
      ...prev,
      containsAlcohol,
      ageVerified: containsAlcohol ? ageConfirmed : false,
      items:       cartItems,
      subtotal,
      tipAmount:   tipAmt,
      taxAmount:   taxAmt,
      totalAmount: total,
    }));
    onNext!();
  };

  /* ================================================================= */
  /*                              UI                                   */
  /* ================================================================= */
  return (
    <div className={styles.checkoutSection}>
      <h4>Golf Order Summary</h4>

      {/* Customer */}
      <div className={styles.customerInfo}>
        <h5>Customer:</h5>
        <p>{displayName || "N/A"}</p>
      </div>
      <hr />

      {/* Line items */}
      {cartItems.map((it, idx) => (
        <div key={idx} className={styles.orderItem}>
          <h5>{`${it.title} × ${it.quantity}`}</h5>
          {it.description && <p>{it.description}</p>}
          {it.spiceLevel && <p>Spice Level: {it.spiceLevel}</p>}
          {it.specialInstructions && <p>Note: {it.specialInstructions}</p>}

          {it.optionGroups && it.selectedOptions && (
            <div className={styles.accompaniments}>
              {it.optionGroups.map(group => {
                const state = it.selectedOptions?.[group.id];
                if (!state?.selectedChoiceIds.length) return null;

                const labels: string[] = [];
                state.selectedChoiceIds.forEach(cid => {
                  const choice = group.choices.find(c => c.id === cid);
                  if (!choice) return;

                  if (!choice.nestedOptionGroup) {
                    labels.push(choice.label ?? cid);
                  } else {
                    state.nestedSelections?.[cid]?.forEach(nid => {
                      const nested = choice.nestedOptionGroup!.choices.find(n => n.id === nid);
                      if (nested) labels.push(nested.label ?? nid);
                    });
                  }
                });

                return (
                  <p key={group.id} className={styles.accompanimentGroup}>
                    <strong>{group.title}:</strong> {labels.join(", ")}
                  </p>
                );
              })}
            </div>
          )}

          <p>${priceOf(it).toFixed(2)}</p>
        </div>
      ))}
      <hr />

      {/* Golf meta */}
      <div className={styles.orderTotal}>
        <h5>Order Type:</h5>
        <p>{golfLabel()}</p>
        <h5>Scheduled Time:</h5>
        <p>ASAP</p>
      </div>

      {/* Tip selector */}
      <div className={styles.tipSelection}>
        <h5>Add a Tip?</h5>
        <div className={styles.tipOptions}>
          {["0", "10", "15", "20"].map(pct => (
            <button
              key={pct}
              className={tip === pct ? styles.btnPrimary : styles.btnOutlinePrimary}
              onClick={() => onTipChange(pct)}
            >
              {pct === "0" ? "No Tip" : `${pct}%`}
            </button>
          ))}
          <button
            className={tip === "custom" ? styles.btnPrimary : styles.btnOutlinePrimary}
            onClick={() => onTipChange("custom")}
          >
            Custom
          </button>
        </div>

        {tip === "custom" && (
          <div className={styles.formGroup}>
            <label htmlFor="customTip">Custom Tip Amount</label>
            <input
              id="customTip"
              name="customTip"
              type="number"
              min="0"
              className={styles.formControl}
              value={customTip}
              onChange={onCustomTipChange}
            />
          </div>
        )}
      </div>
      <hr />

      {/* Alcohol check */}
      {containsAlcohol && (
        <div className={styles.alcoholNotice}>
          <p className={styles.alcoholText}>
            ⚠️ Your order contains alcohol. You must confirm you’re at least 21 years old.
          </p>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={e => setAgeConfirmed(e.target.checked)}
            />{" "}
            I confirm I am at least 21 years old
          </label>
        </div>
      )}

      {/* Totals */}
      <div className={styles.orderTotal}>
        <h5>Tip Amount:</h5>
        <p>${tipAmt.toFixed(2)}</p>
        <h5>Tax ({(rate * 100).toFixed(2)}%):</h5>
        <p>${taxAmt.toFixed(2)}</p>
        <hr />
        <h5>Total:</h5>
        <p>${total.toFixed(2)}</p>
      </div>

      {/* Nav */}
      <div className={styles.navigationButtons}>
        <button
          type="button"
          onClick={onBack}
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSweepWave}`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={proceed}
          disabled={containsAlcohol && !ageConfirmed}
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
