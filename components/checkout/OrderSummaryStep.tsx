"use client";

import React, { useContext, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "@/components/checkout/OrderSummaryStep.module.css";
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

interface SelectedOptions {
  [groupId: string]: {
    selectedChoiceIds: string[];
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

function calculateItemPrice(item: any): number {
  let basePrice = item.price ?? 0;

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

const LoadingBar: React.FC = () => (
  <>
    <div className={styles.loadingBarContainer}>
      <div className={styles.loadingBarInner} />
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
  const { order, setOrder } = useContext(OrderContext)!;
  // Destructure to get the dynamic, human-friendly order id from the order.
  const { schedule, orderId, deliveryAddress } = order;
  const router = useRouter();
  const { isOpen } = useOpeningHours();
  const { deliveryCharges: adminSettings, loading: adminLoading } = useContext(DeliveryChargesContext)!;

  const [formattedSchedule, setFormattedSchedule] = useState("Instant Order (ASAP)");
  const [deliveryCalculationParams, setDeliveryCalculationParams] = useState<DeliveryCalculationParams | null>(null);
  const hasFetchedDistance = useRef(false);
  const usedTaxRate = typeof taxRate === "number" ? taxRate : TAX_RATE;
  const restaurantAddress =
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS ||
    "20025 Mount Aetna Road, Hagerstown, MD 21742";

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

  const subtotal = cartItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);
  const tipAmount = calculateTipAmount(subtotal, tip, customTip);
  const taxAmount = calculateTaxAmount(subtotal, usedTaxRate);

  let dynamicDeliveryFee = 0;
  if (deliveryCalculationParams) {
    const feeResult = calculateDeliveryFee(deliveryCalculationParams);
    dynamicDeliveryFee = feeResult.customerFee;
  }
  const finalDeliveryFee = deliveryCalculationParams ? dynamicDeliveryFee : deliveryFee || 0;
  const total = calculateTotalWithTipAndTax(subtotal, tipAmount, taxAmount, finalDeliveryFee);

  const handleNext = () => {
    if (!schedule && !isOpen) {
      alert("Restaurant is currently closed. Please schedule your order.");
      router.push("/schedule-order?returnUrl=/checkout?step=orderSummary");
      return;
    }

    setOrder((prev) => ({
      ...prev,
      items: cartItems,
      totalAmount: parseFloat(total.toString()),
    }));

    onNext();
  };

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

  const content = adminLoading ? (
    <LoadingBar />
  ) : (
    <div>
      <h4>Order Summary</h4>
      {/* Order ID is displayed below the summary header using a secondary color */}
      <div className={styles.orderIdSecondary}>
        <strong>Order ID:</strong> {orderId || "N/A"}
      </div>
      <hr />
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
      <div className={styles.orderTotal}>
        <h5>Subtotal:</h5>
        <p>${subtotal.toFixed(2)}</p>
      </div>
      <div className={styles.orderSummary}>
        <div className={styles.orderTotal}>
          <h5>Order Type:</h5>
          <p>{getOrderTypeLabel(orderType)}</p>
        </div>
        <div className={styles.orderTotal}>
          <h5>Scheduled Time:</h5>
          <p>{formattedSchedule}</p>
        </div>
        {orderType.includes("delivery") && deliveryAddress && (
          <div className={styles.deliveryDetails}>
            <h5>Delivery Address:</h5>
            <p>
              {deliveryAddress.street}, {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zipCode}
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
        {orderType.includes("delivery") && deliveryCalculationParams && (
          <CheckoutDeliveryInfo {...deliveryCalculationParams} orderSubtotal={subtotal} />
        )}
      </div>
      <div className={styles.tipSelection}>
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
          <div className={styles.formGroup}>
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
      <div className={styles.orderTotal}>
        <h5>Tip Amount:</h5>
        <p>${tipAmount.toFixed(2)}</p>
        <h5>Tax ({(usedTaxRate * 100).toFixed(2)}%):</h5>
        <p>${taxAmount.toFixed(2)}</p>
        <hr />
        <h5>Total:</h5>
        <p>${parseFloat(total.toString()).toFixed(2)}</p>
      </div>
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
