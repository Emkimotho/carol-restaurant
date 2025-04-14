// File: components/checkout/OrderSummaryStep.tsx
"use client";

import React, { useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/checkout/Checkout.module.css";
import { OrderContext } from "@/contexts/OrderContext";
import { useOpeningHours } from "@/contexts/OpeningHoursContext";
import {
  calculateTipAmount,
  calculateTaxAmount,
  calculateTotalWithTipAndTax,
} from "@/utils/checkoutUtils";
import { TAX_RATE } from "@/config/taxConfig";
import CheckoutDeliveryInfo from "@/components/checkout/CheckoutDeliveryInfo";
import { getDeliveryEstimates, DeliveryEstimates } from "@/utils/getDeliveryEstimates";
import {
  calculateDeliveryFee,
  DeliveryCalculationParams,
} from "@/utils/calculateDeliveryFee";
import { DeliveryChargesContext } from "@/contexts/DeliveryChargesContext";

//
// TYPES AND INTERFACES
//

interface SelectedOptions {
  [groupId: string]: {
    selectedChoiceIds: string[];
    // Maps a choiceId -> array of nested choice IDs
    nestedSelections?: { [choiceId: string]: string[] };
  };
}

interface OptionGroup {
  id: string;
  choices: {
    id: string;
    priceAdjustment?: number;
    nestedOptionGroup?: {
      choices: {
        id: string;
        priceAdjustment?: number;
      }[];
    };
  }[];
}

//
// PRICE CALCULATION FOR ITEMS
//

/**
 * Calculates the final price for an item by including its base price,
 * the price adjustments from its option groups and nested options,
 * and multiplying by the item quantity.
 */
function calculateItemPrice(item: any): number {
  // Start with the base item price (or 0 if undefined)
  let basePrice = item.price ?? 0;

  // If the item has option groups and selected options, iterate through them.
  if (item.optionGroups && item.selectedOptions) {
    item.optionGroups.forEach((group: OptionGroup) => {
      const groupState = item.selectedOptions[group.id];
      if (groupState) {
        group.choices.forEach((choice) => {
          if (groupState.selectedChoiceIds.includes(choice.id)) {
            basePrice += choice.priceAdjustment ?? 0;
            if (choice.nestedOptionGroup && groupState.nestedSelections?.[choice.id]) {
              const nestedSelected = groupState.nestedSelections[choice.id];
              choice.nestedOptionGroup.choices.forEach((nested) => {
                if (nestedSelected.includes(nested.id)) {
                  basePrice += nested.priceAdjustment ?? 0;
                }
              });
            }
          }
        });
      }
    });
  }

  const quantity = item.quantity || 1;
  return basePrice * quantity;
}

//
// LOADING BAR COMPONENT
//
// A simple loading bar component that shows a progress animation.
//
const LoadingBar: React.FC = () => (
  <>
    <div
      style={{
        width: "100%",
        height: "4px",
        backgroundColor: "#e0e0e0",
        position: "relative",
        overflow: "hidden",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          width: "50%",
          height: "100%",
          backgroundColor: "var(--primary-color)",
          position: "absolute",
          left: "-50%",
          animation: "loadingAnim 1.5s infinite",
        }}
      />
    </div>
    <style jsx global>{`
      @keyframes loadingAnim {
        0% {
          transform: translateX(0);
        }
        50% {
          transform: translateX(100%);
        }
        100% {
          transform: translateX(200%);
        }
      }
    `}</style>
  </>
);

//
// ORDER SUMMARY STEP COMPONENT
//

export interface OrderSummaryStepProps {
  cartItems: any[];
  getTotalPrice: () => number;
  orderType: string;
  tip: string;
  customTip: string;
  onTipChange: (value: string) => void;
  onCustomTipChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onBack: () => void;
  deliveryFee?: number;
  taxRate?: number;
}

const OrderSummaryStep: React.FC<OrderSummaryStepProps> = ({
  cartItems,
  getTotalPrice,
  orderType,
  tip,
  customTip,
  onTipChange,
  onCustomTipChange,
  onNext,
  onBack,
  deliveryFee,
  taxRate,
}) => {
  //--------------------------------------
  // CONTEXT & HOOKS
  //--------------------------------------
  const { order, setOrder } = useContext(OrderContext)!;
  const { schedule, orderId, deliveryAddress } = order;
  const router = useRouter();
  const { isOpen } = useOpeningHours();
  const { deliveryCharges: adminSettings, loading: adminLoading } = useContext(
    DeliveryChargesContext
  )!;

  // Local state for formatted scheduled time.
  const [formattedSchedule, setFormattedSchedule] = useState("Instant Order (ASAP)");
  // Local state for delivery fee calculation parameters.
  const [deliveryCalculationParams, setDeliveryCalculationParams] =
    useState<DeliveryCalculationParams | null>(null);
  // Ref to ensure the distance is fetched only once.
  const hasFetchedDistance = useRef(false);
  // Use the provided tax rate or fallback to the default TAX_RATE.
  const usedTaxRate = typeof taxRate === "number" ? taxRate : TAX_RATE;

  // Default restaurant address for pickup/delivery.
  const restaurantAddress =
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS ||
    "20025 Mount Aetna Road, Hagerstown, MD 21742";

  //--------------------------------------
  // FORMAT THE SCHEDULE TIME
  //--------------------------------------
  useEffect(() => {
    if (schedule) {
      const dateObj = new Date(schedule);
      const formatted = dateObj.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      setFormattedSchedule(formatted);
    } else {
      setFormattedSchedule("Instant Order (ASAP)");
    }
  }, [schedule]);

  //--------------------------------------
  // FETCH DELIVERY ESTIMATES (if order type includes "delivery")
  //--------------------------------------
  useEffect(() => {
    if (!orderType.includes("delivery")) return;
    if (
      !deliveryAddress ||
      !deliveryAddress.street?.trim() ||
      !deliveryAddress.city?.trim() ||
      !deliveryAddress.state?.trim() ||
      !deliveryAddress.zipCode?.trim()
    ) {
      return;
    }
    if (hasFetchedDistance.current) return;
    hasFetchedDistance.current = true;

    const origin = restaurantAddress;
    const destination = `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}`;
    getDeliveryEstimates(origin, destination).then((estimates: DeliveryEstimates) => {
      const numericSettings = {
        ratePerMile: parseFloat(adminSettings.ratePerMile),
        ratePerHour: parseFloat(adminSettings.ratePerHour),
        restaurantFeePercentage: parseFloat(adminSettings.restaurantFeePercentage),
        minimumCharge: parseFloat(adminSettings.minimumCharge),
        freeDeliveryThreshold: parseFloat(adminSettings.freeDeliveryThreshold),
      };

      // Note: Use the getTotalPrice function to calculate the order subtotal.
      setDeliveryCalculationParams({
        distance: estimates.distance,
        travelTimeMinutes: estimates.travelTimeMinutes,
        ratePerMile: numericSettings.ratePerMile,
        ratePerHour: numericSettings.ratePerHour,
        restaurantFeePercentage: numericSettings.restaurantFeePercentage,
        orderSubtotal: getTotalPrice(),
        minimumCharge: numericSettings.minimumCharge,
        freeDeliveryThreshold: numericSettings.freeDeliveryThreshold,
      });
    });
  }, [orderType, deliveryAddress, restaurantAddress, cartItems, adminSettings, getTotalPrice]);

  //--------------------------------------
  // SUBTOTAL, TIP, TAX, AND TOTAL CALCULATIONS
  //--------------------------------------
  // Calculate subtotal from cart items.
  const subtotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
  // Calculate tip amount based on the provided tip value.
  const tipAmount = calculateTipAmount(subtotal, tip, customTip);
  // Calculate tax amount using the used tax rate.
  const taxAmount = calculateTaxAmount(subtotal, usedTaxRate);

  let dynamicDeliveryFee = 0;
  if (deliveryCalculationParams) {
    const feeResult = calculateDeliveryFee(deliveryCalculationParams);
    dynamicDeliveryFee = feeResult.customerFee;
  }
  const finalDeliveryFee = deliveryCalculationParams
    ? dynamicDeliveryFee
    : deliveryFee || 0;

  // Calculate the final total including tip, tax, and delivery fee.
  const total = calculateTotalWithTipAndTax(subtotal, tipAmount, taxAmount, finalDeliveryFee);

  //--------------------------------------
  // HANDLER: Proceed to Next Step
  //--------------------------------------
  const handleNext = () => {
    // If the restaurant is closed and no schedule is set, force scheduling.
    if (!schedule && !isOpen) {
      alert("Restaurant is currently closed. Please schedule your order.");
      router.push("/schedule-order?returnUrl=/checkout?step=orderSummary");
      return;
    }

    // Save cart items and final total in the order context.
    setOrder((prev) => ({
      ...prev,
      items: cartItems,
      totalAmount: parseFloat(total.toString()),
    }));

    onNext();
  };

  //--------------------------------------
  // HELPER: Get Order Type Label (based on the orderType string)
  //--------------------------------------
  const getOrderTypeLabel = (type: string): string => {
    switch (type) {
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

  //--------------------------------------
  // CONTENT: Conditional Rendering
  //--------------------------------------
  const content = adminLoading ? (
    <LoadingBar />
  ) : (
    <div>
      <h4>Order Summary</h4>

      {/* Order ID */}
      <div className={styles.orderId}>
        <strong>Order ID:</strong> {orderId || "N/A"}
      </div>

      <hr />

      {/* Render each cart item */}
      {cartItems.map((item, index) => (
        <div key={index} className={styles.orderItem}>
          <h5>{(item.title || item.name) + ` x ${item.quantity}`}</h5>
          {item.description && <p>{item.description}</p>}
          {item.spiceLevel && <p>Spice Level: {item.spiceLevel}</p>}
          {item.specialInstructions && <p>Note: {item.specialInstructions}</p>}
          <p>${calculateItemPrice(item).toFixed(2)}</p>
        </div>
      ))}

      <hr />

      {/* Subtotal */}
      <div className={styles.orderTotal}>
        <h5>Subtotal:</h5>
        <p>${subtotal.toFixed(2)}</p>
      </div>

      {/* Order Type, Scheduled Time & Address Info */}
      <div className={styles.orderSummary} style={{ marginTop: "1.5rem" }}>
        <div className={styles.orderTotal}>
          <h5>Order Type:</h5>
          <p>{getOrderTypeLabel(orderType)}</p>
        </div>
        <div className={styles.orderTotal}>
          <h5>Scheduled Time:</h5>
          <p>{formattedSchedule}</p>
        </div>

        {/* Delivery Details */}
        {orderType.includes("delivery") && deliveryAddress && (
          <div className={styles.deliveryDetails}>
            <h5>Delivery Address:</h5>
            <p>
              {deliveryAddress.street}, {deliveryAddress.city},{" "}
              {deliveryAddress.state} {deliveryAddress.zipCode}
            </p>
            {deliveryAddress.deliveryOption && (
              <>
                <h5>Delivery Option:</h5>
                <p>
                  {deliveryAddress.deliveryOption === "handToMe" && "Hand to me"}
                  {deliveryAddress.deliveryOption === "leaveAtDoor" && "Leave at the door"}
                  {deliveryAddress.deliveryOption === "readMyInstructions" && "Custom Instructions"}
                </p>
              </>
            )}
            {deliveryAddress.deliveryOption === "readMyInstructions" && (
              <>
                <h5>Delivery Instructions:</h5>
                <p>{deliveryAddress.deliveryInstructions}</p>
              </>
            )}
          </div>
        )}

        {/* Pickup Details */}
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

        {/* Delivery Fee Breakdown */}
        {orderType.includes("delivery") && deliveryCalculationParams && (
          <CheckoutDeliveryInfo
            {...deliveryCalculationParams}
            orderSubtotal={subtotal}
          />
        )}
      </div>

      {/* Tip Selection */}
      <div className={`${styles.tipSelection} mt-4`}>
        <h5>Add a Tip?</h5>
        <div className={styles.tipOptions}>
          <button
            className={`${styles.btn} ${tip === "0" ? styles.btnPrimary : styles.btnOutlinePrimary}`}
            onClick={() => onTipChange("0")}
          >
            No Tip
          </button>
          <button
            className={`${styles.btn} ${tip === "10" ? styles.btnPrimary : styles.btnOutlinePrimary}`}
            onClick={() => onTipChange("10")}
          >
            10%
          </button>
          <button
            className={`${styles.btn} ${tip === "15" ? styles.btnPrimary : styles.btnOutlinePrimary}`}
            onClick={() => onTipChange("15")}
          >
            15%
          </button>
          <button
            className={`${styles.btn} ${tip === "20" ? styles.btnPrimary : styles.btnOutlinePrimary}`}
            onClick={() => onTipChange("20")}
          >
            20%
          </button>
          <button
            className={`${styles.btn} ${tip === "custom" ? styles.btnPrimary : styles.btnOutlinePrimary}`}
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

      {/* Tip, Tax, and Final Total */}
      <div className={`${styles.orderTotal} mt-4`}>
        <h5>Tip Amount:</h5>
        <p>${tipAmount.toFixed(2)}</p>
        <h5>Tax ({(usedTaxRate * 100).toFixed(2)}%):</h5>
        <p>${taxAmount.toFixed(2)}</p>
        <hr />
        <h5 style={{ fontWeight: "bold", color: "#000" }}>Total:</h5>
        <p style={{ fontWeight: "bold", color: "#000" }}>
          ${parseFloat(total.toString()).toFixed(2)}
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

  return <div className={styles.checkoutSection}>{content}</div>;
};

export default OrderSummaryStep;
