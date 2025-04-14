"use client";

import React from "react";
import { calculateDeliveryFee, DeliveryCalculationParams } from "@/utils/calculateDeliveryFee";
import styles from "./CheckoutDeliveryInfo.module.css";

interface CheckoutDeliveryInfoProps {
  distance: number;
  travelTimeMinutes: number;
  orderSubtotal: number; // Items-only cost
  ratePerMile: number;
  ratePerHour: number;
  restaurantFeePercentage: number;
  minimumCharge: number;
  freeDeliveryThreshold: number;
}

const CheckoutDeliveryInfo: React.FC<CheckoutDeliveryInfoProps> = ({
  distance,
  travelTimeMinutes,
  orderSubtotal,
  ratePerMile,
  ratePerHour,
  restaurantFeePercentage,
  minimumCharge,
  freeDeliveryThreshold,
}) => {
  const feeParams: DeliveryCalculationParams = {
    distance,
    travelTimeMinutes,
    ratePerMile,
    ratePerHour,
    restaurantFeePercentage,
    orderSubtotal,
    minimumCharge,
    freeDeliveryThreshold,
  };

  console.log("[CheckoutDeliveryInfo] feeParams =>", feeParams);

  const { customerFee, freeDelivery, additionalAmountForFree, discountSaved } =
    calculateDeliveryFee(feeParams);

  console.log("[CheckoutDeliveryInfo] feeResult =>", {
    customerFee,
    freeDelivery,
    additionalAmountForFree,
    discountSaved,
  });

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Delivery Fee Details</h3>
      {freeDelivery ? (
        <div>
          <p className={styles.text}>You qualify for free delivery!</p>
          {discountSaved !== undefined && discountSaved > 0 && (
            <p className={styles.text}>
              You saved ${discountSaved.toFixed(2)} on this order!
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className={styles.text}>Your delivery fee: ${customerFee.toFixed(2)}</p>
          <p className={styles.text}>
            Add ${additionalAmountForFree.toFixed(2)} more to qualify for free delivery.
          </p>
        </div>
      )}
    </div>
  );
};

export default CheckoutDeliveryInfo;
