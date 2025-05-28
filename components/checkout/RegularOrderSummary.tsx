/* ======================================================================= */
/*  File: components/checkout/RegularOrderSummary.tsx                      */
/* ----------------------------------------------------------------------- */
/*  Unified order summary for MAIN-menu flows (pickup & delivery).         */
/*  Handles option pricing correctly *and* compiles under strict TS rules. */
/* ======================================================================= */

"use client";

import React, { useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import styles                       from "./OrderSummaryStep.module.css";
import { OrderContext }             from "@/contexts/OrderContext";
import { useOpeningHours }          from "@/contexts/OpeningHoursContext";
import { DeliveryChargesContext }   from "@/contexts/DeliveryChargesContext";

import {
  calculateTipAmount,
  calculateTaxAmount,
  calculateTotalWithTipAndTax,
}                                   from "@/utils/checkoutUtils";
import { TAX_RATE }                 from "@/config/taxConfig";
import CheckoutDeliveryInfo         from "@/components/checkout/CheckoutDeliveryInfo";
import {
  getDeliveryEstimates,
  DeliveryEstimates,
}                                   from "@/utils/getDeliveryEstimates";
import {
  calculateDeliveryFee,
  DeliveryCalculationParams,
  DeliveryCalculationResult,
}                                   from "@/utils/calculateDeliveryFee";

import type {
  CartItem,
  OrderSummaryStepProps,
} from "@/utils/types";

/* ------------------------------------------------------------------ */
/*  Helper sub-types (for option-price calculations)                  */
/* ------------------------------------------------------------------ */
interface OptionChoice {
  id: string;
  label?: string;
  priceAdjustment?: number;
  nestedOptionGroup?: {
    choices: { id: string; label?: string; priceAdjustment?: number }[];
  };
}

interface OptionGroup {
  id: string;
  title?: string;
  choices: OptionChoice[];
}

/* ---------- tiny util --------- */
const roundTwo = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/*  Helper: compute full item price including all option add-ons      */
/* ------------------------------------------------------------------ */
function calculateItemPrice(item: CartItem): number {
  let extras = 0;

  if (item.optionGroups && item.selectedOptions) {
    item.optionGroups.forEach((group: OptionGroup) => {
      const state = item.selectedOptions?.[group.id];
      if (!state) return;

      group.choices.forEach((choice: OptionChoice) => {
        if (!state.selectedChoiceIds.includes(choice.id)) return;

        /* apply parent adjustment only when it has no nested group */
        if (!choice.nestedOptionGroup) extras += choice.priceAdjustment ?? 0;

        if (choice.nestedOptionGroup) {
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

  return roundTwo((item.price + extras) * (item.quantity ?? 1));
}

/* =================================================================== */
/*                           Component                                 */
/* =================================================================== */
const RegularOrderSummary: React.FC<OrderSummaryStepProps> = ({
  cartItems,
  getTotalPrice,
  orderType,
  tip,
  customTip,
  onTipChange,
  onCustomTipChange,
  onNext,
  onBack,
  taxRate,
}) => {
  /* ------------------ context & hooks ----------------------------- */
  const { order, setOrder } = useContext(OrderContext)!;
  const router              = useRouter();
  const { isOpen }          = useOpeningHours();
  const {
    deliveryCharges: admin,
    loading:         adminLoading,
  } = useContext(DeliveryChargesContext)!;

  /* ------------------ local state --------------------------------- */
  const [formattedSchedule, setFormattedSchedule] =
    useState("Instant Order (ASAP)");
  const [deliveryParams, setDeliveryParams] =
    useState<DeliveryCalculationParams | null>(null);
  const [deliveryResult, setDeliveryResult] =
    useState<DeliveryCalculationResult | null>(null);
  const hasFetchedDistance = useRef(false);

  /* ------------------ helper: delivery instructions --------------- */
  const deliveryInstructionsLabel = (): string => {
    const opt   = order.deliveryAddress.deliveryOption;
    const instr = order.deliveryAddress.deliveryInstructions;
    if (opt === "handToMe")            return "Hand to me";
    if (opt === "leaveAtDoor")         return "Leave at the door";
    if (opt === "readMyInstructions")  return instr || "Leave at the door";
    return instr || opt || "Hand to me";
  };

  /* ------------------ constants ----------------------------------- */
  const usedTaxRate = typeof taxRate === "number" ? taxRate : TAX_RATE;
  const restaurantAddress =
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS ||
    "20025 Mount Aetna Road, Hagerstown, MD 21742";
  const displayName =
    order.customerId && order.customerName
      ? order.customerName
      : order.guestName;

  /* ------------------ schedule → human string --------------------- */
  useEffect(() => {
    if (order.schedule) {
      const d = new Date(order.schedule);
      setFormattedSchedule(
        d.toLocaleString([], {
          weekday: "short",
          month:   "short",
          day:     "numeric",
          hour:    "2-digit",
          minute:  "2-digit",
        })
      );
    } else {
      setFormattedSchedule("Instant Order (ASAP)");
    }
  }, [order.schedule]);

  /* ------------------ distance + delivery fee --------------------- */
  useEffect(() => {
    if (!orderType.includes("delivery")) return;

    if (
      !order.deliveryAddress.street?.trim() ||
      !order.deliveryAddress.city?.trim() ||
      !order.deliveryAddress.state?.trim() ||
      !order.deliveryAddress.zipCode?.trim()
    )
      return;

    if (hasFetchedDistance.current) return;
    hasFetchedDistance.current = true;

    const origin      = restaurantAddress;
    const destination =
      `${order.deliveryAddress.street}, ` +
      `${order.deliveryAddress.city}, ` +
      `${order.deliveryAddress.state} ` +
      `${order.deliveryAddress.zipCode}`;

    getDeliveryEstimates(origin, destination)
      .then((est: DeliveryEstimates) => {
        const params: DeliveryCalculationParams = {
          distance:                est.distance,
          travelTimeMinutes:       Math.ceil(est.travelTimeMinutes),
          ratePerMile:             parseFloat(admin.ratePerMile),
          ratePerHour:             parseFloat(admin.ratePerHour),
          restaurantFeePercentage: parseFloat(admin.restaurantFeePercentage),
          orderSubtotal:           getTotalPrice(),
          minimumCharge:           parseFloat(admin.minimumCharge),
          freeDeliveryThreshold:   parseFloat(admin.freeDeliveryThreshold),
        };
        setDeliveryParams(params);
        setDeliveryResult(calculateDeliveryFee(params));

        /* store distance/time in context */
        setOrder(prev => ({
          ...prev,
          deliveryDistanceMiles: est.distance,
          deliveryTimeMinutes:   Math.ceil(est.travelTimeMinutes),
        }));
      })
      .catch(err => console.error("Distance fetch error:", err));
  }, [
    orderType,
    order.deliveryAddress,
    admin,
    getTotalPrice,
    restaurantAddress,
    setOrder,
  ]);

  /* ------------------ price maths --------------------------------- */
  const subtotal   = cartItems.reduce((sum, it) => sum + calculateItemPrice(it), 0);
  const tipAmt     = calculateTipAmount(subtotal, tip, customTip);
  const taxAmt     = calculateTaxAmount(subtotal, usedTaxRate);
  const customerFee = deliveryResult?.customerFee ?? 0;

  const rawTotal = calculateTotalWithTipAndTax(
    subtotal,
    tipAmt,
    taxAmt,
    customerFee
  );
  const total = typeof rawTotal === "string" ? parseFloat(rawTotal) : rawTotal;

  /* ------------------ label helper -------------------------------- */
  const typeLabel = (t: string): string => {
    switch (t) {
      case "pickup":             return "Pickup";
      case "delivery":           return "Delivery";
      case "instant_pickup":     return "Pickup (Immediate)";
      case "instant_delivery":   return "Delivery (Immediate)";
      case "scheduled_pickup":   return "Pickup (Scheduled)";
      case "scheduled_delivery": return "Delivery (Scheduled)";
      default:                   return "Not specified";
    }
  };

  /* ------------------ Next ---------------------------------------- */
  const handleNext = (): void => {
    if (!order.schedule && !isOpen) {
      alert("Restaurant is currently closed. Please schedule your order.");
      router.push("/schedule-order?returnUrl=/checkout?step=orderSummary");
      return;
    }

    const totalFee = deliveryResult?.totalFee ?? customerFee;
    const hasAlcohol = cartItems.some(ci => ci.isAlcohol);

    setOrder(prev => ({
      ...prev,
      /* reset alcohol flags based on current cart */
      containsAlcohol: hasAlcohol,
      ageVerified:     hasAlcohol ? prev.ageVerified : false,

      items:                 cartItems,
      totalAmount:           total,
      tipAmount:             tipAmt,
      taxAmount:             taxAmt,
      customerDeliveryFee:   roundTwo(customerFee),
      restaurantDeliveryFee: roundTwo(totalFee - customerFee),
      totalDeliveryFee:      roundTwo(totalFee),
      deliveryDistanceMiles: deliveryParams?.distance          ?? 0,
      deliveryTimeMinutes:   deliveryParams?.travelTimeMinutes ?? 0,
      driverPayout:          roundTwo(totalFee + tipAmt),
    }));

    onNext();
  };

  /* ------------------ loading guard ------------------------------ */
  if (adminLoading) return <div>Loading…</div>;

  /* ================================================================= */
  /*                            RENDER                                 */
  /* ================================================================= */
  return (
    <div className={styles.checkoutSection}>
      <h4>Order Summary</h4>

      {/* Customer */}
      <div className={styles.customerInfo}>
        <h5>Customer:</h5>
        <p>{displayName || "N/A"}</p>
      </div>

      <hr />

      {/* Line items */}
      {cartItems.map((item: CartItem, idx: number) => (
        <div key={idx} className={styles.orderItem}>
          <h5>{`${item.title} x ${item.quantity}`}</h5>
          {item.description         && <p>{item.description}</p>}
          {item.spiceLevel          && <p>Spice Level: {item.spiceLevel}</p>}
          {item.specialInstructions && <p>Note: {item.specialInstructions}</p>}

          {/* Accompaniments */}
          {item.optionGroups && item.selectedOptions && (
            <div className={styles.accompaniments}>
              {item.optionGroups.map((group: OptionGroup) => {
                const state = item.selectedOptions?.[group.id];
                if (!state?.selectedChoiceIds.length) return null;

                const labels: string[] = [];

                state.selectedChoiceIds.forEach(cid => {
                  const choice = group.choices.find(c => c.id === cid);
                  if (!choice) return;

                  if (!choice.nestedOptionGroup) {
                    labels.push(choice.label ?? cid);
                  }

                  if (
                    choice.nestedOptionGroup &&
                    state.nestedSelections?.[cid]?.length
                  ) {
                    state.nestedSelections[cid].forEach(nid => {
                      const nested = choice.nestedOptionGroup!.choices.find(
                        n => n.id === nid
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

          <p>${calculateItemPrice(item).toFixed(2)}</p>
        </div>
      ))}

      <hr />

      {/* Subtotal */}
      <div className={styles.orderTotal}>
        <h5>Subtotal:</h5>
        <p>${subtotal.toFixed(2)}</p>
      </div>

      {/* Meta rows */}
      <div className={styles.orderSummary}>
        <div className={styles.orderTotal}>
          <h5>Order Type:</h5>
          <p>{typeLabel(orderType)}</p>
        </div>

        <div className={styles.orderTotal}>
          <h5>Scheduled Time:</h5>
          <p>{formattedSchedule}</p>
        </div>

        {orderType.includes("delivery") && order.deliveryAddress && (
          <div className={styles.deliveryDetails}>
            <h5>Delivery Address:</h5>
            <p>
              {order.deliveryAddress.street}, {order.deliveryAddress.city},{" "}
              {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
            </p>
            <h5>Delivery Instructions:</h5>
            <p>{deliveryInstructionsLabel()}</p>
          </div>
        )}

        {orderType.includes("pickup") && (
          <div className={styles.pickupDetails}>
            <h5>Pickup Location:</h5>
            <p>
              {restaurantAddress}
              <br />
              Phone: (240) 313-2819
            </p>
          </div>
        )}

        {orderType.includes("delivery") &&
          deliveryParams &&
          deliveryResult && (
            <CheckoutDeliveryInfo
              {...deliveryParams}
              orderSubtotal={subtotal}
              customerFee={roundTwo(customerFee)}
            />
          )}
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
              value={customTip}
              onChange={onCustomTipChange}
              className={styles.formControl}
              min="0"
            />
          </div>
        )}
      </div>

      {/* Totals */}
      <div className={styles.orderTotal}>
        <h5>Tip Amount:</h5>
        <p>${tipAmt.toFixed(2)}</p>

        <h5>Tax ({(usedTaxRate * 100).toFixed(2)}%):</h5>
        <p>${taxAmt.toFixed(2)}</p>

        <h5>Delivery Fee:</h5>
        <p>${roundTwo(customerFee).toFixed(2)}</p>

        <hr />

        <h5>Total:</h5>
        <p>${total.toFixed(2)}</p>
      </div>

      {/* Nav buttons */}
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

export default RegularOrderSummary;
