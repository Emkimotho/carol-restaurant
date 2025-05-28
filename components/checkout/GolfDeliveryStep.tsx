// File: components/checkout/GolfDeliveryStep.tsx
//
// Lets the guest choose one of three golf fulfilment modes & stores
//   • deliveryType           ("PICKUP_AT_CLUBHOUSE" | "ON_COURSE" | "EVENT_PAVILION")
//   • holeNumber             via setCartInfo(null, hole)
// Unrelated golf fields are cleared whenever the user switches modes.
// ---------------------------------------------------------------------

"use client";

import React, { useContext } from "react";
import styles from "./GolfDeliveryStep.module.css";
import { OrderContext, DeliveryType } from "@/contexts/OrderContext";

interface GolfDeliveryStepProps {
  onNext?: () => void;
  onBack?: () => void;
}

const OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: "PICKUP_AT_CLUBHOUSE", label: "Pick-up at Clubhouse" },
  { value: "ON_COURSE",            label: "On-Course Delivery" },
  { value: "EVENT_PAVILION",       label: "Event Pavilion" },
];

const GolfDeliveryStep: React.FC<GolfDeliveryStepProps> = ({
  onNext,
  onBack,
}) => {
  const { order, setDeliveryType, setCartInfo } = useContext(OrderContext)!;

  // When the user picks one of the radio options:
  // • Clear unrelated golf fields
  // • Set deliveryType
  const handleRadio = (dt: DeliveryType) => () => {
    if (dt !== "ON_COURSE") {
      setCartInfo(null, null);
    }
    setDeliveryType(dt);
  };

  // Only shown when deliveryType === "ON_COURSE"
  // Captures the hole number (1–18)
  const handleHole = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hole = e.target.value ? Number(e.target.value) : null;
    setCartInfo(null, hole);
  };

  return (
    <div className={styles.container}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          Where should we send your order?
        </legend>

        {OPTIONS.map(({ value, label }) => (
          <label key={value} className={styles.radioLabel}>
            <input
              type="radio"
              name="deliveryType"
              value={value}
              checked={order.deliveryType === value}
              onChange={handleRadio(value)}
            />
            {label}
          </label>
        ))}

        {order.deliveryType === "ON_COURSE" && (
          <div className={styles.onCourseFields}>
            <label className={styles.fieldLabel}>
              Hole Number
              <select
                name="holeNumber"
                value={order.holeNumber ?? ""}
                onChange={handleHole}
              >
                <option value="">Select hole…</option>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>
                    Hole {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </fieldset>

      {(onBack || onNext) && (
        <div className={styles.navButtons}>
          {onBack && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onBack}
            >
              Back
            </button>
          )}
          {onNext && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onNext}
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default GolfDeliveryStep;
