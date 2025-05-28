// File: components/checkout/CheckoutDeliveryInfo.tsx
"use client";

import React from "react";
import {
  calculateDeliveryFee,
  DeliveryCalculationParams,
} from "@/utils/calculateDeliveryFee";
import styles from "./CheckoutDeliveryInfo.module.css";

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */
interface CheckoutDeliveryInfoProps extends DeliveryCalculationParams {
  /** Pre‑computed fee passed from parent (so we don’t double‑calculate) */
  customerFee: number;
}

/* ================================================================== */
/*                    CheckoutDeliveryInfo                            */
/* ================================================================== */
const CheckoutDeliveryInfo: React.FC<CheckoutDeliveryInfoProps> = ({
  customerFee,              // from parent (after restaurant deduction)
  ...feeParams              // distance / time / rates / thresholds
}) => {
  /* If parent passed the fee we trust it; call helper only to know
     freeDelivery / additionalAmountForFree flags for the UI.         */
  const { freeDelivery, additionalAmountForFree, discountSaved } =
    calculateDeliveryFee({ ...feeParams });

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
          <p className={styles.text}>
            Your delivery fee: ${customerFee.toFixed(2)}
          </p>
          <p className={styles.text}>
            Add ${additionalAmountForFree.toFixed(2)} more to unlock free
            delivery.
          </p>
        </div>
      )}
    </div>
  );
};

export default CheckoutDeliveryInfo;
