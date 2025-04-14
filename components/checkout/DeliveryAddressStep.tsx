"use client";

import React, { useState, useEffect, useContext, ChangeEvent, FormEvent } from "react";
import styles from "@/app/checkout/Checkout.module.css";
import { OrderContext } from "@/contexts/OrderContext";

// Make these fields optional if you don't always pass them.
interface DeliveryAddressFields {
  street: string;
  aptSuite?: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryOption?: string;
  deliveryInstructions?: string;
}

interface DeliveryAddressStepProps {
  // The parent component passes these props in:
  deliveryAddress: DeliveryAddressFields;
  onChange: (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

const DeliveryAddressStep: React.FC<DeliveryAddressStepProps> = ({
  deliveryAddress,
  onChange,
  onNext,
  onBack,
}) => {
  const { order, setDeliveryAddress } = useContext(OrderContext)!;

  // We'll store a local copy of the address so we can handle internal changes.
  // Then we sync changes back to the parent with onChange & setDeliveryAddress.
  const [localAddress, setLocalAddress] = useState<DeliveryAddressFields>(deliveryAddress);
  const [showInstructions, setShowInstructions] = useState(false);
  const [confirmDefault, setConfirmDefault] = useState(false);

  // Toggle instructions based on delivery option selection.
  useEffect(() => {
    if (localAddress.deliveryOption === "readMyInstructions") {
      setShowInstructions(true);
    } else {
      setShowInstructions(false);
      setConfirmDefault(false);
    }
  }, [localAddress.deliveryOption]);

  // Whenever localAddress changes, we update context & call parent's onChange.
  useEffect(() => {
    setDeliveryAddress(localAddress);
  }, [localAddress, setDeliveryAddress]);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const updated = { ...localAddress, [name]: value };
    setLocalAddress(updated);
    onChange(e); // Let the parent also track changes, if needed
  };

  // Handle confirmation checkbox change.
  const handleConfirmChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmDefault(e.target.checked);
  };

  // Validate and proceed to the next step.
  const handleNext = (e: FormEvent) => {
    e.preventDefault();

    // Ensure a delivery option is chosen.
    if (!localAddress.deliveryOption) {
      alert("Please choose a delivery option.");
      return;
    }

    // If "Read my delivery instructions" is selected, require confirmation.
    if (localAddress.deliveryOption === "readMyInstructions") {
      if (!confirmDefault) {
        alert(
          "Please confirm that if you do not provide delivery instructions, your order will default to 'Leave at the door'."
        );
        return;
      }
      // If instructions are empty, default to "Leave at the door".
      if (
        !localAddress.deliveryInstructions ||
        localAddress.deliveryInstructions.trim() === ""
      ) {
        const updatedAddress = {
          ...localAddress,
          deliveryInstructions: "Leave at the door",
        };
        setLocalAddress(updatedAddress);
      }
    }

    onNext();
  };

  return (
    <div className={styles.checkoutSection}>
      <h4>Delivery Address</h4>
      <form>
        <div className={styles.formGroup}>
          <label htmlFor="street">
            Street Address<span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="street"
            id="street"
            value={localAddress.street}
            onChange={handleInputChange}
            className={styles.formControl}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="aptSuite">Apt/Suite (optional)</label>
          <input
            type="text"
            name="aptSuite"
            id="aptSuite"
            value={localAddress.aptSuite || ""}
            onChange={handleInputChange}
            className={styles.formControl}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="city">
            City<span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="city"
            id="city"
            value={localAddress.city}
            onChange={handleInputChange}
            className={styles.formControl}
            required
          />
        </div>
        <div className={styles.formRow}>
          <div className={`${styles.formGroup} ${styles.colMd6}`}>
            <label htmlFor="state">
              State<span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="state"
              id="state"
              value={localAddress.state}
              onChange={handleInputChange}
              className={styles.formControl}
              required
            />
          </div>
          <div className={`${styles.formGroup} ${styles.colMd6}`}>
            <label htmlFor="zipCode">
              Zip Code<span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="zipCode"
              id="zipCode"
              value={localAddress.zipCode}
              onChange={handleInputChange}
              className={styles.formControl}
              required
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="deliveryOption">
            Delivery Options<span className={styles.required}>*</span>
          </label>
          <select
            id="deliveryOption"
            name="deliveryOption"
            value={localAddress.deliveryOption || ""}
            onChange={handleInputChange}
            className={styles.formControl}
            required
          >
            <option value="" disabled>
              Choose delivery option
            </option>
            <option value="handToMe">Hand to me</option>
            <option value="leaveAtDoor">Leave at the door</option>
            <option value="readMyInstructions">Read my delivery instructions</option>
          </select>
        </div>
        {showInstructions && (
          <>
            <div className={styles.formGroup}>
              <label htmlFor="deliveryInstructions">
                Delivery Instructions<span className={styles.required}>*</span>
              </label>
              <textarea
                id="deliveryInstructions"
                name="deliveryInstructions"
                value={localAddress.deliveryInstructions || ""}
                onChange={handleInputChange}
                className={styles.formControl}
                placeholder="Enter additional instructions for delivery..."
                required={localAddress.deliveryOption === "readMyInstructions"}
              />
            </div>
            <div className={styles.formGroup}>
              <input
                type="checkbox"
                id="confirmDefault"
                name="confirmDefault"
                checked={confirmDefault}
                onChange={handleConfirmChange}
              />
              <label htmlFor="confirmDefault" className={styles.checkboxLabel}>
                I confirm that if I do not provide delivery instructions, my order will default to &quot;Leave at the door&quot; and I cannot complain later.
              </label>
            </div>
          </>
        )}
      </form>
      <div className={styles.navigationButtons}>
        <button
          type="button"
          onClick={onBack}
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSweepWave}`}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default DeliveryAddressStep;
