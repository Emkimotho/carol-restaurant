// File: components/checkout/GolfOrderSummary.tsx
//
// Renders the order summary for golf & mixed-menu orders.
//
// • Shows customer name.
// • Lists each line item with title, qty, description, spice level, notes, options.
// • Displays golf delivery label via getDeliveryLabel helper.
// • Defaults schedule to ASAP on first mount.
// • Tip selector (0 %, 10 %, 15 %, 20 %, or custom).
// • Alcohol check below totals.
// • Calculates subtotal, tip, tax, grand-total.
// • On “Next” writes all values into OrderContext.
//

"use client";

import React, { useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

import styles from "./OrderSummaryStep.module.css";

import { OrderContext } from "@/contexts/OrderContext";
import { CartItem, OrderSummaryStepProps } from "@/utils/types";
import {
  calculateTipAmount,
  calculateTaxAmount,
  calculateTotalWithTipAndTax,
} from "@/utils/checkoutUtils";
import { TAX_RATE }            from "@/config/taxConfig";
import { DeliveryType }        from "@prisma/client";
import { getDeliveryLabel }    from "@/utils/getDeliveryLabel";

/* ──────────────────────────────────────────────────────────── */
/* Helper: compute full price of a single cart item            */
/* ──────────────────────────────────────────────────────────── */
function priceOf(item: CartItem): number {
  let extras = 0;

  if (item.optionGroups && item.selectedOptions) {
    item.optionGroups.forEach((group) => {
      const state = item.selectedOptions?.[group.id];
      if (!state) return;

      group.choices.forEach((choice) => {
        if (!state.selectedChoiceIds.includes(choice.id)) return;

        // parent choice
        if (!choice.nestedOptionGroup) {
          extras += choice.priceAdjustment ?? 0;
        } else {
          // nested choices
          const nestedSel = state.nestedSelections?.[choice.id] ?? [];
          choice.nestedOptionGroup.choices.forEach((nested) => {
            if (nestedSel.includes(nested.id)) {
              extras += nested.priceAdjustment ?? 0;
            }
          });
        }
      });
    });
  }

  return (item.price + extras) * item.quantity;
}

/* =================================================================== */
/*                        Component                                    */
/* =================================================================== */
export default function GolfOrderSummary(
  props: OrderSummaryStepProps & { containsAlcohol: boolean }
) {
  const {
    cartItems,
    tip,
    customTip,
    onTipChange,
    onCustomTipChange,
    onBack,
    onNext,
    taxRate,
    containsAlcohol,
  } = props;

  const { order, setOrder } = useContext(OrderContext)!;
  const { data: session }   = useSession();

  /* ───────────── local age-checkbox state ───────────── */
  const [ageConfirmed, setAgeConfirmed] = useState(order.ageVerified);

  /* ───────────── default schedule → ASAP ───────────── */
  useEffect(() => {
    if (!order.schedule) {
      setOrder((prev) => ({ ...prev, schedule: new Date().toISOString() }));
    }
  }, [order.schedule, setOrder]);

  /* ───────────── money math ───────────── */
  const subtotal = cartItems.reduce((s, it) => s + priceOf(it), 0);
  const tipAmt   = calculateTipAmount(subtotal, tip, customTip);
  const rate     = typeof taxRate === "number" ? taxRate : TAX_RATE;
  const taxAmt   = calculateTaxAmount(subtotal, rate);
  const rawTotal = calculateTotalWithTipAndTax(subtotal, tipAmt, taxAmt, 0);
  const total    = typeof rawTotal === "string" ? parseFloat(rawTotal) : rawTotal;

  /* ───────────── display name ───────────── */
  const displayName =
    session?.user?.name ||
    (order.customerId && order.customerName
      ? order.customerName
      : order.guestName);

  /* ───────────── golf / delivery label ───────────── */
  const golfLabel = getDeliveryLabel(
    order.deliveryType as DeliveryType,
    order.holeNumber
  );

  /* ───────────── Next handler ───────────── */
  const proceed = () => {
    if (containsAlcohol && !ageConfirmed) {
      toast.warn("Please confirm you’re at least 21 years old to continue.");
      return;
    }

    setOrder((prev) => ({
      ...prev,
      containsAlcohol,
      ageVerified: containsAlcohol ? ageConfirmed : false,
      items:        cartItems,
      subtotal,
      tipAmount:    tipAmt,
      taxAmount:    taxAmt,
      totalAmount:  total,
    }));
    onNext?.();
  };

  /* ================================================================= */
  /*                             UI                                    */
  /* ================================================================= */
  return (
    <div className={styles.checkoutSection}>
      <h4>Golf Order Summary</h4>

      {/* Customer info */}
      <div className={styles.customerInfo}>
        <h5>Customer:</h5>
        <p>{displayName || "N/A"}</p>
      </div>
      <hr />

      {/* Line items */}
      {cartItems.map((it, idx) => (
        <div key={idx} className={styles.orderItem}>
          <h5>{`${it.title} × ${it.quantity}`}</h5>
          {it.description          && <p>{it.description}</p>}
          {it.spiceLevel           && <p>Spice Level: {it.spiceLevel}</p>}
          {it.specialInstructions  && <p>Note: {it.specialInstructions}</p>}

          {/* Option selections */}
          {it.optionGroups && it.selectedOptions && (
            <div className={styles.accompaniments}>
              {it.optionGroups.map((group) => {
                const state = it.selectedOptions?.[group.id];
                if (!state?.selectedChoiceIds.length) return null;

                const labels: string[] = [];

                state.selectedChoiceIds.forEach((cid) => {
                  const choice = group.choices.find((c) => c.id === cid);
                  if (!choice) return;

                  if (!choice.nestedOptionGroup) {
                    labels.push(choice.label ?? cid);
                  } else {
                    state.nestedSelections?.[cid]?.forEach((nid) => {
                      const nested = choice.nestedOptionGroup!.choices.find(
                        (n) => n.id === nid
                      );
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
        <p>{golfLabel}</p>
        <h5>Scheduled Time:</h5>
        <p>ASAP</p>
      </div>

      {/* Tip selector */}
      <div className={styles.tipSelection}>
        <h5>Add a Tip?</h5>
        <div className={styles.tipOptions}>
          {["0", "10", "15", "20"].map((pct) => (
            <button
              key={pct}
              className={
                tip === pct ? styles.btnPrimary : styles.btnOutlinePrimary
              }
              onClick={() => onTipChange(pct)}
            >
              {pct === "0" ? "No Tip" : `${pct}%`}
            </button>
          ))}
          <button
            className={
              tip === "custom" ? styles.btnPrimary : styles.btnOutlinePrimary
            }
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

      {/* Totals */}
      <div className={styles.orderTotal}>
        <h5>Tip Amount:</h5>
        <p>${tipAmt.toFixed(2)}</p>
        <h5>
          Tax ({(rate * 100).toFixed(2)}
          %):
        </h5>
        <p>${taxAmt.toFixed(2)}</p>
        <hr />
        <h5>Total:</h5>
        <p>${total.toFixed(2)}</p>
      </div>

      {/* Alcohol notice */}
      {containsAlcohol && (
        <div className={styles.alcoholNotice}>
          <p className={styles.alcoholText}>
            ⚠️ Your order contains alcohol. You must confirm you’re at least 21
            years old.
          </p>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
            />{" "}
            I confirm I am at least 21 years old
          </label>
        </div>
      )}

      {/* Navigation buttons */}
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
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
