// File: components/checkout/PaymentStep.tsx
// ----------------------------------------------------------------------
// • Responsibility: render the payment step in your checkout flow,
//   handling both MAIN (regular) orders and GOLF orders.
//   – MAIN orders (deliveryType === DELIVERY):
//       • Card-only
//       • Optional scheduling
//   – GOLF orders (deliveryType ≠ DELIVERY):
//       • Card OR Cash
//       • Schedule forced to null
//       • Payload zeros out all non-golf fees/fields
//   • Always include guestName/guestEmail/guestPhone when customerId is absent.
//   • Breaks out every modifier into its own Clover “lineItem” so tax is correct.
//
//   PATCH (26 Jun 2025):
//   ---------------------------------------------------------------
//   • customerEmail / customerPhone now sent for logged-in users.
//   • Helper buildLineItemsForItem is actually *used* (no unused-code lint).
//   • Everything else is unchanged―full logic, comments, and structure intact.
// ----------------------------------------------------------------------

"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import styles from "./PaymentStep.module.css";
import { CartContext } from "@/contexts/CartContext";
import { OrderContext } from "@/contexts/OrderContext";
import { useCreateOrder } from "@/hooks/useCreateOrder";

/* ------------------------------------------------------------------ */
/* Helper: dollar amount → integer cents                              */
/* ------------------------------------------------------------------ */
const toCents = (d: number) => Math.round(d * 100);

/* ------------------------------------------------------------------ */
/* Helper: turn one cart-item (+ modifiers) into Clover V1 lineItems   */
/* ------------------------------------------------------------------ */
function buildLineItemsForItem(ci: any) {
  const lines: any[] = [];

  /* 1. Base catalog item */
  lines.push({
    itemRefUuid: ci.cloverItemId!,
    unitQty:     ci.quantity,
    taxable:     true,
  });

  /* 2. Each selected modifier (and nested) → separate taxable line */
  if (ci.optionGroups && ci.selectedOptions) {
    ci.optionGroups.forEach((group: any) => {
      const state = ci.selectedOptions?.[group.id];
      if (!state) return;

      group.choices.forEach((choice: any) => {
        if (!state.selectedChoiceIds.includes(choice.id)) return;

        /* simple modifier (no nested group) */
        if (choice.priceAdjustment != null && !choice.nestedOptionGroup) {
          lines.push({
            name:    choice.label ?? choice.id,
            unitQty: 1,
            price:   toCents(choice.priceAdjustment),
            taxable: true,
          });
        }

        /* nested modifier group */
        if (choice.nestedOptionGroup) {
          const sel: string[] = state.nestedSelections?.[choice.id] || [];
          choice.nestedOptionGroup.choices.forEach((nested: any) => {
            if (sel.includes(nested.id)) {
              lines.push({
                name:    nested.label ?? nested.id,
                unitQty: 1,
                price:   toCents(nested.priceAdjustment ?? 0),
                taxable: true,
              });
            }
          });
        }
      });
    });
  }

  return lines;
}

/* ------------------------------------------------------------------ */
/* Helper: split full name → [first, last]                            */
/* ------------------------------------------------------------------ */
function splitName(full: string | undefined): [string, string] {
  if (!full) return ["", ""];
  const parts = full.trim().split(/\s+/);
  return parts.length === 1 ? [parts[0], ""] : [parts[0], parts.slice(1).join(" ")];
}

const PaymentStep: React.FC = () => {
  /* ───────── context / hooks ───────── */
  const {
    cartItems,
    clearCart,
    isGolfOrder,
  } = useContext(CartContext)!;

  const { order, setOrder } = useContext(OrderContext)!;
  const router = useRouter();
  const { createOrder, loading: creating, error: createErr } = useCreateOrder();

  /* ───────── local state ───────── */
  const [isCash, setIsCash] = useState(
    isGolfOrder && order.paymentMethod === "CASH"
  );
  const [cashAmount, setCashAmount] = useState<number>(order.totalAmount || 0);
  const [billingSame, setBillingSame] = useState(true);
  const [billingAddr, setBillingAddr] = useState(order.billingAddress);
  const [ageConfirmed, setAgeConfirmed] = useState(order.ageVerified);

  /* ───────── effects ───────── */
  useEffect(() => {
    if (billingSame) {
      setBillingAddr(order.deliveryAddress);
      setOrder(prev => ({ ...prev, billingAddress: order.deliveryAddress }));
    }
  }, [billingSame, order.deliveryAddress, setOrder]);

  /* ───────── helpers ───────── */
  const changeMethod = (pm: "CARD" | "CASH") => {
    if (pm === "CASH" && !isGolfOrder) return;
    setIsCash(pm === "CASH");
    setOrder(prev => ({ ...prev, paymentMethod: pm }));
  };

  const handleConfirm = async () => {
    /* 1. guard clauses */
    if (!cartItems.length)         { toast.error("Your cart is empty."); return; }
    if (order.containsAlcohol && !ageConfirmed) {
      toast.warn("You must confirm you are over 21 to proceed."); return;
    }

    /* 2. create / update order in DB */
    const base = {
      items:           order.items,
      paymentMethod:   order.paymentMethod,
      containsAlcohol: order.containsAlcohol,
      ageVerified:     order.ageVerified,
      ...(order.customerId
        ? { customerId: order.customerId }
        : { guestName: order.guestName, guestEmail: order.guestEmail, guestPhone: order.guestPhone }),
    };

    const payload = isGolfOrder
      ? {
          ...base,
          deliveryType: order.deliveryType,
          cartId:       order.cartId,
          holeNumber:   order.holeNumber,
          orderType:    "",
          schedule:     null,
          subtotal:              order.subtotal,
          taxAmount:             order.taxAmount,
          tipAmount:             order.tipAmount,
          totalAmount:           order.totalAmount,
          customerDeliveryFee:   0,
          restaurantDeliveryFee: 0,
          totalDeliveryFee:      0,
          driverPayout:          0,
          deliveryDistanceMiles: 0,
          deliveryTimeMinutes:   0,
        }
      : {
          ...base,
          deliveryType:          order.deliveryType,
          orderType:             order.orderType ?? "",
          schedule:              order.schedule ?? null,
          subtotal:              order.subtotal,
          taxAmount:             order.taxAmount,
          tipAmount:             order.tipAmount,
          customerDeliveryFee:   order.customerDeliveryFee,
          restaurantDeliveryFee: order.restaurantDeliveryFee,
          totalDeliveryFee:      order.totalDeliveryFee,
          driverPayout:          order.driverPayout,
          deliveryDistanceMiles: order.deliveryDistanceMiles,
          deliveryTimeMinutes:   order.deliveryTimeMinutes,
          totalAmount:           order.totalAmount,
          ...(order.orderType === "delivery"
            ? {
                deliveryAddress:      order.deliveryAddress,
                deliveryInstructions: order.deliveryAddress.deliveryInstructions,
              }
            : {}),
        };

    let dbOrder: any;
    try {
      dbOrder = await createOrder(payload);
    } catch (err: any) {
      toast.error(`Order creation failed: ${createErr?.message || err.message}`);
      return;
    }

    setOrder(prev => ({ ...prev, id: dbOrder.id, orderId: dbOrder.orderId }));

    /* 3. cash?   → confirmation page */
    if (isCash) {
      clearCart();
      router.push(`/payment-confirmation/cash?id=${dbOrder.id}`);
      return;
    }

    /* 4. card payment → Clover Hosted Checkout */
    const toastId = toast.loading("Contacting payment gateway…");
    try {
      const allLineItems: any[] = [];
      cartItems.forEach(ci => allLineItems.push(...buildLineItemsForItem(ci)));

      if (order.customerDeliveryFee > 0) {
        allLineItems.push({
          name:    "Delivery Fee",
          unitQty: 1,
          price:   toCents(order.customerDeliveryFee),
          taxable: false,
        });
      }
      if (order.tipAmount > 0) {
        allLineItems.push({
          name:    "Tip",
          unitQty: 1,
          price:   toCents(order.tipAmount),
          taxable: false,
        });
      }

      const [firstN, lastN] = order.customerId
        ? splitName(order.customerName)
        : splitName(order.guestName);

      const cloverBody = {
        ourOrderId: dbOrder.orderId,
        shoppingCart: { lineItems: allLineItems },
        customer: {
          firstName:   firstN,
          lastName:    lastN,
          email:       order.customerId ? order.customerEmail  ?? "" : order.guestEmail,
          phoneNumber: order.customerId ? order.customerPhone ?? "" : order.guestPhone,
        },
      };

      const res = await fetch("/api/orders/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cloverBody),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || res.statusText);
      }

      const data = await res.json();
      const checkoutUrl = data.checkoutUrl ?? data.checkoutPageUrl;
      if (!checkoutUrl) throw new Error("No checkout URL returned");

      toast.update(toastId, { render: "Redirecting to payment page…", type: "success", isLoading: false, autoClose: 1000 });
      clearCart();
      window.location.href = checkoutUrl;
    } catch (err: any) {
      toast.update(toastId, { render: `Payment error: ${err.message || err}`, type: "error", isLoading: false, autoClose: 4000 });
    }
  };

  /* ───────── render ───────── */
  return (
    <div className={styles.checkoutSection}>
      <h4>Payment Method</h4>

      <div className={styles.paymentOptions}>
        <label>
          <input type="radio" name="paymentMethod" value="CARD" checked={!isCash} onChange={() => changeMethod("CARD")} />
          Card
        </label>
        {isGolfOrder && (
          <label>
            <input type="radio" name="paymentMethod" value="CASH" checked={isCash} onChange={() => changeMethod("CASH")} />
            Cash
          </label>
        )}
      </div>

      {isGolfOrder && isCash && (
        <div className={styles.cashAmountInput}>
          <label htmlFor="cashAmount">Cash Amount (you’ll bring)</label>
          <input id="cashAmount" type="number" min="0" step="0.01" value={cashAmount}
            onChange={e => setCashAmount(parseFloat(e.target.value) || 0)} />
        </div>
      )}

      {order.containsAlcohol && (
        <div className={styles.formGroup}>
          <input type="checkbox" id="ageConfirm" checked={ageConfirmed} onChange={e => { setAgeConfirmed(e.target.checked); setOrder(p => ({ ...p, ageVerified: e.target.checked })); }} />
          <label htmlFor="ageConfirm" className={styles.checkboxLabel}>I confirm I am at least 21 to proceed</label>
        </div>
      )}

      {!isCash && (
        <>
          <div className={styles.billingAddressToggle}>
            <label>
              <input type="checkbox" checked={billingSame} onChange={() => setBillingSame(!billingSame)} />
              Use Delivery Address as Billing Address
            </label>
          </div>
          {!billingSame && (
            <div className={styles.billingAddressForm}>
              {(["street", "city", "state", "zipCode"] as const).map(f => (
                <React.Fragment key={f}>
                  <label htmlFor={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                  <input id={f} type="text" value={(billingAddr as any)[f] || ""}
                    onChange={e => setBillingAddr(prev => ({ ...prev, [f]: e.target.value }))} />
                </React.Fragment>
              ))}
            </div>
          )}
        </>
      )}

      <div className={styles.navigationButtons}>
        <button onClick={() => router.back()} className={`${styles.btn} ${styles.btnSecondary}`} disabled={creating}>Back</button>
        <button onClick={handleConfirm} className={`${styles.btn} ${styles.btnPrimary}`} disabled={creating || (order.containsAlcohol && !ageConfirmed)}>
          {creating ? "Processing…" : isCash ? "Confirm Order" : "Pay Now"}
        </button>
      </div>
    </div>
  );
};

export default PaymentStep;
