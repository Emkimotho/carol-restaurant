/* ------------------------------------------------------------------ */
/*  File: components/checkout/DeliveryAddressStep.tsx                 */
/* ------------------------------------------------------------------ */
/*  Step UI for MAIN‑menu “Delivery” orders.                          *
 *                                                                    *
 *  • Allows the user to keep their saved address or enter a new one. *
 *  • Lets the user choose one of three hand‑off options:             *
 *      – “Leave at the door”   → instructions auto‑set to that text  *
 *      – “Hand to me”          → instructions auto‑set to that text  *
 *      – “Read my instructions”→ textarea appears (required unless   *
 *                                 they tick a confirmation box).     *
 *  • Guarantees `deliveryInstructions` is **never null / empty**     *
 *    before advancing to the next wizard step.                       *
 *  • Every edit immediately updates both local state **and** the     *
 *    OrderContext copy via `setDeliveryAddress`.                     */
/* ------------------------------------------------------------------ */

"use client";

import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  ChangeEvent,
  FormEvent,
} from "react";
import styles from "./DeliveryAddressStep.module.css";
import { OrderContext, type DeliveryAddress } from "@/contexts/OrderContext";

/* ------------------------------------------------------------------ */
/*  Helper: default text for the two “simple” options                 */
/* ------------------------------------------------------------------ */
const DEFAULT_NOTE: Record<string, string> = {
  leaveAtDoor: "Leave at the door",
  handToMe:    "Hand to me",
};

interface DeliveryAddressStepProps {
  deliveryAddress: DeliveryAddress;
  onChange: (
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function DeliveryAddressStep({
  deliveryAddress,
  onChange,
  onNext,
  onBack,
}: DeliveryAddressStepProps) {
  const { setDeliveryAddress } = useContext(OrderContext)!;

  /* -------------- refs & local state ---------------- */
  const originalRef = useRef<DeliveryAddress>(deliveryAddress);

  const [localAddress, setLocalAddress] = useState<DeliveryAddress>(
    deliveryAddress
  );
  const [useDifferent, setUseDifferent]   = useState(false);
  const [showInstructions, setShowInstr]  = useState(
    deliveryAddress.deliveryOption === "readMyInstructions"
  );
  const [confirmDefault, setConfirmDefault] = useState(false);

  /* -------------- sync when parent prop changes ------ */
  useEffect(() => {
    originalRef.current = deliveryAddress;
    if (!useDifferent) {
      setLocalAddress(deliveryAddress);
    }
  }, [deliveryAddress, useDifferent]);

  /* -------------- toggle saved / different ----------- */
  const handleToggle = (e: ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setUseDifferent(checked);
    if (checked) {
      const blank: DeliveryAddress = {
        street: "",
        aptSuite: "",
        city: "",
        state: "",
        zipCode: "",
        deliveryOption: "",
        deliveryInstructions: "",
      };
      setLocalAddress(blank);
      setDeliveryAddress(blank);
    } else {
      const orig = originalRef.current;
      setLocalAddress(orig);
      setDeliveryAddress(orig);
    }
  };

  /* -------------- react to deliveryOption change ----- */
  const applyDeliveryOption = (opt: string, prev: DeliveryAddress) => {
    /* show / hide textarea */
    setShowInstr(opt === "readMyInstructions");

    /* reset confirm‑checkbox when leaving the custom branch */
    if (opt !== "readMyInstructions") setConfirmDefault(false);

    /* inject default instructions for simple options */
    const instr =
      opt === "readMyInstructions"
        ? prev.deliveryInstructions ?? ""
        : DEFAULT_NOTE[opt] ?? "";

    return { ...prev, deliveryOption: opt, deliveryInstructions: instr };
  };

  /* -------------- generic change handler ------------- */
  const handleInputChange = (
    e: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    let updated: DeliveryAddress;
    if (name === "deliveryOption") {
      updated = applyDeliveryOption(value, localAddress);
    } else {
      updated = { ...localAddress, [name]: value };
    }

    setLocalAddress(updated);
    setDeliveryAddress(updated);
    onChange(e);
  };

  /* -------------- confirm default checkbox ----------- */
  const handleConfirmChange = (e: ChangeEvent<HTMLInputElement>) =>
    setConfirmDefault(e.target.checked);

  /* -------------- NEXT validation -------------------- */
  const handleNext = (e: FormEvent) => {
    e.preventDefault();

    const { street, city, state, zipCode, deliveryOption } = localAddress;

    if (!street.trim() || !city.trim() || !state.trim() || !zipCode.trim()) {
      return alert("Please complete all required address fields.");
    }

    if (!deliveryOption) {
      return alert("Please choose a delivery option.");
    }

    /* Custom‑instruction branch */
    if (deliveryOption === "readMyInstructions") {
      const hasText = localAddress.deliveryInstructions?.trim().length;
      if (!hasText && !confirmDefault) {
        return alert(
          "Please enter delivery instructions or tick the confirmation box."
        );
      }
      /* If left blank & confirmed → write default */
      if (!hasText && confirmDefault) {
        const updated = {
          ...localAddress,
          deliveryInstructions: DEFAULT_NOTE.leaveAtDoor,
        };
        setLocalAddress(updated);
        setDeliveryAddress(updated);
      }
    }

    onNext();
  };

  /* ---------------------------------------------------------------- */
  /*  RENDER                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className={styles.checkoutSection}>
      <h4>Delivery Address</h4>

      {/* Banner + toggle */}
      <div className={styles.banner}>
        <span className={styles.bannerText}>
          Your saved address is pre‑filled. Tick the box to enter a different
          address.
        </span>
        <label className={styles.toggleLabel}>
          <input type="checkbox" checked={useDifferent} onChange={handleToggle} />{" "}
          Use different address
        </label>
      </div>

      <form>
        {/* Street */}
        <div className={styles.formGroup}>
          <input
            className={styles.formControl}
            type="text"
            name="street"
            placeholder="Street Address *"
            value={localAddress.street}
            onChange={handleInputChange}
            disabled={!useDifferent && !!originalRef.current.street}
          />
        </div>

        {/* Apt / Suite */}
        <div className={styles.formGroup}>
          <input
            className={styles.formControl}
            type="text"
            name="aptSuite"
            placeholder="Apt/Suite (optional)"
            value={localAddress.aptSuite || ""}
            onChange={handleInputChange}
            disabled={!useDifferent && !!originalRef.current.aptSuite}
          />
        </div>

        {/* City */}
        <div className={styles.formGroup}>
          <input
            className={styles.formControl}
            type="text"
            name="city"
            placeholder="City *"
            value={localAddress.city}
            onChange={handleInputChange}
            disabled={!useDifferent && !!originalRef.current.city}
          />
        </div>

        {/* State + ZIP */}
        <div className={styles.formRow}>
          <div className={styles.colMd6}>
            <input
              className={styles.formControl}
              type="text"
              name="state"
              placeholder="State *"
              value={localAddress.state}
              onChange={handleInputChange}
              disabled={!useDifferent && !!originalRef.current.state}
            />
          </div>
          <div className={styles.colMd6}>
            <input
              className={styles.formControl}
              type="text"
              name="zipCode"
              placeholder="Zip Code *"
              value={localAddress.zipCode}
              onChange={handleInputChange}
              disabled={!useDifferent && !!originalRef.current.zipCode}
            />
          </div>
        </div>

        {/* Delivery option */}
        <div className={styles.formGroup}>
          <select
            className={styles.formControl}
            name="deliveryOption"
            value={localAddress.deliveryOption}
            onChange={handleInputChange}
          >
            <option value="">Choose a delivery option…</option>
            <option value="leaveAtDoor">Leave at the door</option>
            <option value="handToMe">Hand to me</option>
            <option value="readMyInstructions">Read my delivery instructions</option>
          </select>
        </div>

        {/* Custom instructions textarea */}
        {showInstructions && (
          <>
            <div className={styles.formGroup}>
              <textarea
                className={styles.formControl}
                name="deliveryInstructions"
                placeholder="Delivery Instructions *"
                value={localAddress.deliveryInstructions || ""}
                onChange={handleInputChange}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={confirmDefault}
                  onChange={handleConfirmChange}
                />{" "}
                Use default “Leave at the door” if left blank
              </label>
            </div>
          </>
        )}
      </form>

      {/* Nav buttons */}
      <div className={styles.navigationButtons}>
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onBack}
        >
          Back
        </button>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
