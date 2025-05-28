// File: components/checkout/OrderTypeStep.tsx
// ───────────────────────────────────────────────────────────────────
// Renders the “Pickup” vs. “Delivery” choice for main-menu orders,
// updates both the local wizard state and the shared OrderContext,
// and sets deliveryType accordingly.
// ───────────────────────────────────────────────────────────────────

"use client";

import React, { useContext, Dispatch, SetStateAction } from "react";
import styles from "@/components/checkout/OrderTypeStep.module.css";
import { OrderContext } from "@/contexts/OrderContext";

export type OrderType = "" | "pickup" | "delivery";

interface OrderTypeStepProps {
  /** The currently selected order type */
  orderType: OrderType;
  /** Setter for the parent wizard’s orderType state */
  onSelectOrderType: Dispatch<SetStateAction<OrderType>>;
  /** Callback to advance the wizard */
  onNext: () => void;
  /** Callback to go back in the wizard */
  onBack: () => void;
}

const OrderTypeStep: React.FC<OrderTypeStepProps> = ({
  orderType,
  onSelectOrderType,
  onNext,
  onBack,
}) => {
  const {
    setOrder,
    setDeliveryType,
    setCartInfo,
  } = useContext(OrderContext)!;

  const handleSelect = (type: OrderType) => {
    // 1 — update wizard-level state
    onSelectOrderType(type);

    // 2 — mirror into OrderContext
    setOrder(prev => ({ ...prev, orderType: type }));

    // 3 — set deliveryType for main-menu flow
    if (type === "pickup") {
      setDeliveryType("PICKUP_AT_CLUBHOUSE");
    } else if (type === "delivery") {
      setDeliveryType("DELIVERY");
    }

    // 4 — clear any golf-specific fields
    setCartInfo(null, null);
  };

  return (
    <div className={styles.checkoutSection}>
      <h4>Select Order Type</h4>

      <div className={styles.orderTypeOptions}>
        <button
          className={`${styles.btn} ${
            orderType === "pickup" ? styles.btnPrimary : styles.btnOutlinePrimary
          }`}
          onClick={() => handleSelect("pickup")}
        >
          Pickup
        </button>
        <button
          className={`${styles.btn} ${
            orderType === "delivery"
              ? styles.btnPrimary
              : styles.btnOutlinePrimary
          }`}
          onClick={() => handleSelect("delivery")}
        >
          Delivery
        </button>
      </div>

      {orderType === "pickup" && (
        <div className={`${styles.pickupDetails} mt-3`}>
          <h5>Pickup Location:</h5>
          <p>
            20025 Mount Aetna Road
            <br />
            Hagerstown, MD 21742
            <br />
            Phone: (240) 313-2819
          </p>
        </div>
      )}

      <div className={styles.navigationButtons}>
        <button
          onClick={onBack}
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSweepWave}`}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default OrderTypeStep;
