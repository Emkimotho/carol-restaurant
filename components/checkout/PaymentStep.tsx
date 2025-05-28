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
// ----------------------------------------------------------------------

"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast }     from "react-toastify";

import styles             from "./PaymentStep.module.css";
import { CartContext }    from "@/contexts/CartContext";
import { OrderContext }   from "@/contexts/OrderContext";
import { useCreateOrder } from "@/hooks/useCreateOrder";

const PaymentStep: React.FC = () => {
  /* ---------------- Contexts ---------------- */
  const {
    cartItems,
    clearCart,
    isGolfOrder, // true if deliveryType is PICKUP_AT_CLUBHOUSE | ON_COURSE | EVENT_PAVILION
  } = useContext(CartContext)!;

  const { order, setOrder } = useContext(OrderContext)!;
  const router              = useRouter();
  const {
    createOrder,
    loading: creating,
    error:   createErr,
  } = useCreateOrder();

  /* ---------------- Local State ---------------- */
  // Determine if cashier has chosen cash (only for golf)
  const [isCash, setIsCash] = useState(
    isGolfOrder && order.paymentMethod === "CASH"
  );
  // If cash, how much will the customer hand over?
  const [cashAmount, setCashAmount] = useState<number>(order.totalAmount || 0);

  // Billing address toggle (for card)
  const [billingSame, setBillingSame]   = useState(true);
  const [billingAddr, setBillingAddr]   = useState(order.billingAddress);

  // Alcohol age confirmation
  const [ageConfirmed, setAgeConfirmed] = useState(order.ageVerified);

  /* ---------------- Effects ---------------- */
  // If billingSame is checked, sync billing → delivery
  useEffect(() => {
    if (billingSame) {
      setBillingAddr(order.deliveryAddress);
      setOrder(prev => ({
        ...prev,
        billingAddress: order.deliveryAddress,
      }));
    }
  }, [billingSame, order.deliveryAddress, setOrder]);

  /* ---------------- Handlers ---------------- */
  const changeMethod = (pm: "CARD" | "CASH") => {
    if (pm === "CASH" && !isGolfOrder) return; // disallow cash on MAIN
    setIsCash(pm === "CASH");
    setOrder(prev => ({ ...prev, paymentMethod: pm }));
  };

  const toggleBillingSame = () => setBillingSame(s => !s);

  const handleAgeConfirm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ok = e.target.checked;
    setAgeConfirmed(ok);
    setOrder(prev => ({ ...prev, ageVerified: ok }));
  };

  const handleConfirm = async () => {
    // 1) Ensure cart isn't empty
    if (!cartItems.length) {
      toast.error("Your cart is empty.");
      return;
    }
    // 2) If alcohol, ensure age confirmed
    if (order.containsAlcohol && !ageConfirmed) {
      toast.warn("You must confirm you are over 21 to proceed.");
      return;
    }

    // Build base payload
    const base = {
      items:           order.items,
      paymentMethod:   order.paymentMethod,
      containsAlcohol: order.containsAlcohol,
      ageVerified:     order.ageVerified,
      ...(order.customerId
        ? { customerId: order.customerId }
        : {
            guestName:  order.guestName,
            guestEmail: order.guestEmail,
            guestPhone: order.guestPhone,
          }),
    };

    // Golf-specific payload
    const golfPayload = {
      ...base,
      deliveryType:          order.deliveryType,
      cartId:                order.cartId,
      holeNumber:            order.holeNumber,
      orderType:             "",     // required by schema
      schedule:              null,
      subtotal:              order.subtotal,
      taxAmount:             order.taxAmount,
      tipAmount:             order.tipAmount,
      totalAmount:           order.totalAmount,
      // zero out non-golf fields
      customerDeliveryFee:   0,
      restaurantDeliveryFee: 0,
      totalDeliveryFee:      0,
      driverPayout:          0,
      deliveryDistanceMiles: 0,
      deliveryTimeMinutes:   0,
    };

    // Main-order payload
    const mainPayload = {
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

    const payload = isGolfOrder ? golfPayload : mainPayload;

    // Send to backend
    let dbOrder;
    try {
      dbOrder = await createOrder(payload);
    } catch (err: any) {
      toast.error(`Order creation failed: ${createErr?.message || err.message}`);
      return;
    }

    // Persist returned IDs
    setOrder(prev => ({
      ...prev,
      id:      dbOrder.id,
      orderId: dbOrder.orderId,
    }));

    // Handle cash vs card
    if (isCash) {
      // Redirect to your cash-confirmation page
      clearCart();
      router.push(
        `/payment-confirmation/cash?id=${dbOrder.id}&ord=${dbOrder.orderId}`
      );
      return;
    }

    // Card → initiate Clover
    const toastId = toast.loading("Contacting payment gateway…");
    try {
      const res = await fetch("/api/orders/payment", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          orderId: dbOrder.orderId,
          amount:  order.totalAmount,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || res.statusText);
      }
      const { checkoutUrl } = await res.json();
      if (!checkoutUrl) throw new Error("No checkout URL returned");

      toast.update(toastId, {
        render:    "Redirecting to payment page…",
        type:      "success",
        isLoading: false,
        autoClose: 1000,
      });

      clearCart();
      window.location.href = checkoutUrl;
    } catch (err: any) {
      toast.update(toastId, {
        render:    `Payment error: ${err.message || err}`,
        type:      "error",
        isLoading: false,
        autoClose: 4000,
      });
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className={styles.checkoutSection}>
      <h4>Payment Method</h4>

      {/* Payment option radios */}
      <div className={styles.paymentOptions}>
        <label>
          <input
            type="radio"
            name="paymentMethod"
            value="CARD"
            checked={!isCash}
            onChange={() => changeMethod("CARD")}
          />
          Card
        </label>
        {isGolfOrder && (
          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="CASH"
              checked={isCash}
              onChange={() => changeMethod("CASH")}
            />
            Cash
          </label>
        )}
      </div>

      {/* Cash amount input (golf only) */}
      {isGolfOrder && isCash && (
        <div className={styles.cashAmountInput}>
          <label htmlFor="cashAmount">Cash Amount (you’ll bring)</label>
          <input
            id="cashAmount"
            type="number"
            min="0"
            step="0.01"
            value={cashAmount}
            onChange={e => setCashAmount(parseFloat(e.target.value) || 0)}
          />
        </div>
      )}

      {/* Alcohol age check */}
      {order.containsAlcohol && (
        <div className={styles.formGroup}>
          <input
            type="checkbox"
            id="ageConfirm"
            checked={ageConfirmed}
            onChange={handleAgeConfirm}
          />
          <label htmlFor="ageConfirm" className={styles.checkboxLabel}>
            I confirm I am at least 21 years old
          </label>
        </div>
      )}

      {/* Billing address for card only */}
      {!isCash && (
        <>
          <div className={styles.billingAddressToggle}>
            <label>
              <input
                type="checkbox"
                checked={billingSame}
                onChange={toggleBillingSame}
              />
              Use Delivery Address as Billing Address
            </label>
          </div>
          {!billingSame && (
            <div className={styles.billingAddressForm}>
              {(["street","city","state","zipCode"] as const).map(f => (
                <React.Fragment key={f}>
                  <label htmlFor={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </label>
                  <input
                    id={f}
                    type="text"
                    value={(billingAddr as any)[f] || ""}
                    onChange={e =>
                      setBillingAddr(prev => ({
                        ...prev,
                        [f]: e.target.value,
                      }))
                    }
                  />
                </React.Fragment>
              ))}
            </div>
          )}
        </>
      )}

      {/* Navigation buttons */}
      <div className={styles.navigationButtons}>
        <button
          onClick={() => router.back()}
          className={`${styles.btn} ${styles.btnSecondary}`}
          disabled={creating}
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={creating || (order.containsAlcohol && !ageConfirmed)}
        >
          {creating ? "Processing…" : isCash ? "Confirm Order" : "Pay Now"}
        </button>
      </div>
    </div>
  );
};

export default PaymentStep;
