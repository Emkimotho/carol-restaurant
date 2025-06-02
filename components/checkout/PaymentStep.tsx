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
//   • Now also breaks out each modifier into its own “lineItem” so Clover
//     will calculate tax on both the base item and every modifier.
// ----------------------------------------------------------------------

"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import styles from "./PaymentStep.module.css";
import { CartContext } from "@/contexts/CartContext";
import { OrderContext } from "@/contexts/OrderContext";
import { useCreateOrder } from "@/hooks/useCreateOrder";

/**
 * Helper: convert a dollar amount → integer cents
 */
const toCents = (d: number) => Math.round(d * 100);

/**
 * Flatten one cart‐item plus its selected modifiers into V1 lineItems.
 *
 *   - For the “base” menu item, we push `{ itemRefUuid, unitQty, taxable: true }`.
 *   - For each selected option choice (and nested choice), we push a
 *     separate `{ name, unitQty: 1, price, taxable: true }` line.
 */
function buildLineItemsForItem(ci: any) {
  const lines: any[] = [];

  // 1) Main catalog item
  lines.push({
    itemRefUuid: ci.cloverItemId!,
    unitQty:     ci.quantity,
    taxable:     true,
  });

  // 2) If this item has optionGroups + selectedOptions, walk them:
  //    For each OptionGroup → find selectedChoiceIds, push one line per choice.
  if (ci.optionGroups && ci.selectedOptions) {
    ci.optionGroups.forEach((group: any) => {
      const state = ci.selectedOptions?.[group.id];
      if (!state) return;

      group.choices.forEach((choice: any) => {
        if (!state.selectedChoiceIds.includes(choice.id)) return;

        // If choice has no nestedOptionGroup, it’s a simple priceAdjustment:
        if (choice.priceAdjustment != null && !choice.nestedOptionGroup) {
          lines.push({
            name:    choice.label ?? choice.id,
            unitQty: 1,
            price:   toCents(choice.priceAdjustment),
            taxable: true,
          });
        }

        // If choice has nestedOptionGroup, loop over nested selections:
        if (choice.nestedOptionGroup) {
          const nestedSel: string[] = state.nestedSelections?.[choice.id] || [];
          choice.nestedOptionGroup.choices.forEach((nested: any) => {
            if (nestedSel.includes(nested.id)) {
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

const PaymentStep: React.FC = () => {
  /* ---------------- Contexts ---------------- */
  const {
    cartItems,
    clearCart,
    isGolfOrder, // true if deliveryType is PICKUP_AT_CLUBHOUSE | ON_COURSE | EVENT_PAVILION
  } = useContext(CartContext)!;

  const { order, setOrder } = useContext(OrderContext)!;
  const router = useRouter();
  const {
    createOrder,
    loading: creating,
    error: createErr,
  } = useCreateOrder();

  /* ---------------- Local State ---------------- */
  // Determine if cashier has chosen cash (only for golf)
  const [isCash, setIsCash] = useState(
    isGolfOrder && order.paymentMethod === "CASH"
  );
  // If cash, how much will the customer hand over?
  const [cashAmount, setCashAmount] = useState<number>(order.totalAmount || 0);

  // Billing address toggle (for card)
  const [billingSame, setBillingSame] = useState(true);
  const [billingAddr, setBillingAddr] = useState(order.billingAddress);

  // Alcohol age confirmation
  const [ageConfirmed, setAgeConfirmed] = useState(order.ageVerified);

  /* ---------------- Effects ---------------- */
  // If billingSame is checked, sync billing → delivery
  useEffect(() => {
    if (billingSame) {
      setBillingAddr(order.deliveryAddress);
      setOrder((prev) => ({
        ...prev,
        billingAddress: order.deliveryAddress,
      }));
    }
  }, [billingSame, order.deliveryAddress, setOrder]);

  /* ---------------- Handlers ---------------- */
  const changeMethod = (pm: "CARD" | "CASH") => {
    if (pm === "CASH" && !isGolfOrder) return; // disallow cash on MAIN
    setIsCash(pm === "CASH");
    setOrder((prev) => ({ ...prev, paymentMethod: pm }));
  };

  const toggleBillingSame = () => setBillingSame((s) => !s);

  const handleAgeConfirm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ok = e.target.checked;
    setAgeConfirmed(ok);
    setOrder((prev) => ({ ...prev, ageVerified: ok }));
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

    // Build base payload for saving/updating order in our database
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
      orderType:             "",  // required by schema
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

    // Send to backend to create or update “Order” in our database
    let dbOrder: any;
    try {
      dbOrder = await createOrder(payload);
    } catch (err: any) {
      toast.error(`Order creation failed: ${createErr?.message || err.message}`);
      return;
    }

    // Persist returned IDs (so we know which order to mark as PAID later)
    setOrder((prev) => ({
      ...prev,
      id:      dbOrder.id,       // <--- database ID
      orderId: dbOrder.orderId,  // <--- human‐readable code
    }));

    // Handle cash vs card
    if (isCash) {
      // Redirect to cash‐confirmation using the *database* ID
      clearCart();
      router.push(`/payment-confirmation/cash?id=${dbOrder.id}`);
      return;
    }

    // Card → initiate Clover Hosted Checkout (V1)
    const toastId = toast.loading("Contacting payment gateway…");
    try {
      //
      // Build V1 “shoppingCart.lineItems” array:
      //   • one “base item” line per cart‐item,
      //   • plus one line for each selected modifier (and nested modifier),
      //   • plus one “Delivery Fee” line,
      //   • plus one “Tip” line.
      //
      const allLineItems: any[] = [];

      cartItems.forEach((ci) => {
        // a) “Base” item
        allLineItems.push({
          itemRefUuid: ci.cloverItemId!,
          unitQty:     ci.quantity,
          taxable:     true,
        });

        // b) Break out each selected modifier choice:
        if (ci.optionGroups && ci.selectedOptions) {
          ci.optionGroups.forEach((group: any) => {
            const state = ci.selectedOptions?.[group.id];
            if (!state) return;

            group.choices.forEach((choice: any) => {
              if (!state.selectedChoiceIds.includes(choice.id)) return;

              // i) If this choice has no nested group, push one line
              if (choice.priceAdjustment != null && !choice.nestedOptionGroup) {
                allLineItems.push({
                  name:    choice.label ?? choice.id,
                  unitQty: 1,
                  price:   toCents(choice.priceAdjustment),
                  taxable: true,
                });
              }

              // ii) If this choice has a nestedOptionGroup, push one line per nested selection
              if (choice.nestedOptionGroup) {
                const nestedSel: string[] = state.nestedSelections?.[choice.id] || [];
                choice.nestedOptionGroup.choices.forEach((nested: any) => {
                  if (nestedSel.includes(nested.id)) {
                    allLineItems.push({
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
      });

      // c) Append “Delivery Fee” row if > 0
      if (order.customerDeliveryFee > 0) {
        allLineItems.push({
          name:    "Delivery Fee",
          unitQty: 1,
          price:   toCents(order.customerDeliveryFee),
          taxable: false,
        });
      }

      // d) Append “Tip” row if > 0
      if (order.tipAmount > 0) {
        allLineItems.push({
          name:    "Tip",
          unitQty: 1,
          price:   toCents(order.tipAmount),
          taxable: false,
        });
      }

      // e) Build the V1 body shape for our /api/orders/payment route:
      const cloverBody: any = {
        ourOrderId: dbOrder.orderId,
        shoppingCart: {
          lineItems: allLineItems,
        },
      };

      // f) Add “customer” object exactly as before
      if (order.customerId) {
        cloverBody.customer = {
          firstName:   order.customerName ?? "",
          lastName:    "",
          email:       "", // no email stored in context right now
          phoneNumber: "", // no phone stored in context right now
        };
      } else {
        cloverBody.customer = {
          firstName:   order.guestName,
          lastName:    "",
          email:       order.guestEmail,
          phoneNumber: order.guestPhone,
        };
      }

      // g) Leave redirectUrls to our route (it already embeds ourOrderId).
      //    In other words, do NOT set redirectUrls here—our POST handler will
      //    fill them in automatically based on `dbOrder.orderId`.

      // Send payload to our API route
      const res = await fetch("/api/orders/payment", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(cloverBody),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || res.statusText);
      }

      // Clover response has either 'checkoutUrl' or 'checkoutPageUrl'
      const data = await res.json();
      const checkoutUrl = data.checkoutUrl ?? data.checkoutPageUrl;
      if (!checkoutUrl) {
        console.error("PaymentStep received from /api/orders/payment:", data);
        throw new Error("No checkout URL returned");
      }

      toast.update(toastId, {
        render:    "Redirecting to payment page…",
        type:      "success",
        isLoading: false,
        autoClose: 1000,
      });

      clearCart();
      // Immediately send the user into Clover’s Hosted Checkout UI:
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
            onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
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
            I confirm I am at least 21 to proceed
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
              {(["street", "city", "state", "zipCode"] as const).map((f) => (
                <React.Fragment key={f}>
                  <label htmlFor={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </label>
                  <input
                    id={f}
                    type="text"
                    value={(billingAddr as any)[f] || ""}
                    onChange={(e) =>
                      setBillingAddr((prev) => ({
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
