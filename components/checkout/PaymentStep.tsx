"use client";

import React, { useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/checkout/Checkout.module.css";
import { CartContext } from "@/contexts/CartContext";

interface PaymentStepProps {
  orderType: string;
  isSameAddress: boolean;
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  onBillingAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSameAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
}

/**
 * PaymentStep component renders a unified payment form that includes:
 * - Payment information (card number, expiry date, CVV)
 * - Billing address (if applicable)
 * - Terms and conditions agreement
 * - A "Make Payment" button below all fields.
 *
 * The form validates:
 * - The card number must be exactly 16 digits (ignoring spaces)
 * - The expiry date must be in MM/YY format with a valid month (01-12)
 * - The CVV must be exactly 3 digits
 *
 * If validation passes, the cart is cleared and a success message with a redirect
 * button is displayed. The page automatically scrolls to the top on payment success.
 */
const PaymentStep: React.FC<PaymentStepProps> = ({
  orderType,
  isSameAddress,
  billingAddress,
  deliveryAddress,
  onBillingAddressChange,
  onSameAddressChange,
  onBack,
}) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const router = useRouter();
  const { clearCart } = useContext(CartContext)!;

  // Scroll to the top when payment is completed
  useEffect(() => {
    if (paymentCompleted) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [paymentCompleted]);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate card number: remove spaces and ensure exactly 16 digits
    const cleanedCardNumber = cardNumber.replace(/\s+/g, "");
    if (!/^\d{16}$/.test(cleanedCardNumber)) {
      alert("Please enter a valid 16-digit card number.");
      return;
    }

    // Validate expiry date: must be in MM/YY format with month between 01 and 12
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
      alert("Please enter a valid expiry date in MM/YY format.");
      return;
    }

    // Validate CVV: exactly 3 digits
    if (!/^\d{3}$/.test(cvv)) {
      alert("Please enter a valid 3-digit CVV.");
      return;
    }

    // All validations passed: clear the cart and mark payment as complete.
    clearCart();
    setPaymentCompleted(true);
  };

  if (paymentCompleted) {
    return (
      <div className={styles.checkoutSection}>
        <h4>Payment Successful!</h4>
        <p>Your order has been processed successfully.</p>
        <button
          onClick={() => router.push("/menu")}
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
        >
          Go to Menu
        </button>
      </div>
    );
  }

  return (
    <div className={styles.checkoutSection}>
      <h4>Payment Details</h4>
      <form onSubmit={handlePaymentSubmit}>
        <div className={styles.paymentOptions}>
          <p>Enter your payment information:</p>
          <div className={styles.formGroup}>
            <label htmlFor="cardNumber">
              Card Number<span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="cardNumber"
              id="cardNumber"
              className={styles.formControl}
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              required
            />
          </div>
          <div className={styles.formRow}>
            <div className={`${styles.formGroup} ${styles.colMd6}`}>
              <label htmlFor="expiryDate">
                Expiry Date<span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="expiryDate"
                id="expiryDate"
                className={styles.formControl}
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
              />
            </div>
            <div className={`${styles.formGroup} ${styles.colMd6}`}>
              <label htmlFor="cvv">
                CVV<span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="cvv"
                id="cvv"
                className={styles.formControl}
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
        {orderType === "delivery" && (
          <div className={`${styles.formCheck} mt-3`}>
            <input
              type="checkbox"
              name="sameAddress"
              id="sameAddress"
              className={styles.formCheckInput}
              checked={isSameAddress}
              onChange={onSameAddressChange}
            />
            <label htmlFor="sameAddress" className={styles.formCheckLabel}>
              Is your billing address the same as your delivery address?
            </label>
          </div>
        )}
        {((orderType === "delivery" && !isSameAddress) || orderType === "pickup") && (
          <div className={`${styles.billingAddress} mt-3`}>
            <h5>Please Enter Your Billing Address</h5>
            <div className={styles.formGroup}>
              <label htmlFor="billingStreet">
                Street Address<span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="street"
                id="billingStreet"
                value={billingAddress.street}
                onChange={onBillingAddressChange}
                className={styles.formControl}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="billingCity">
                City<span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="city"
                id="billingCity"
                value={billingAddress.city}
                onChange={onBillingAddressChange}
                className={styles.formControl}
                required
              />
            </div>
            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.colMd6}`}>
                <label htmlFor="billingState">
                  State<span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  id="billingState"
                  value={billingAddress.state}
                  onChange={onBillingAddressChange}
                  className={styles.formControl}
                  required
                />
              </div>
              <div className={`${styles.formGroup} ${styles.colMd6}`}>
                <label htmlFor="billingZipCode">
                  Zip Code<span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="zipCode"
                  id="billingZipCode"
                  value={billingAddress.zipCode}
                  onChange={onBillingAddressChange}
                  className={styles.formControl}
                  required
                />
              </div>
            </div>
          </div>
        )}
        <div className={`${styles.formCheck} mt-3`}>
          <input
            type="checkbox"
            name="terms"
            id="terms"
            className={styles.formCheckInput}
            required
          />
          <label htmlFor="terms" className={styles.formCheckLabel}>
            I agree to the{" "}
            <a href="/terms" className={styles.termsLink}>
              terms and conditions
            </a>
            .
          </label>
        </div>
        <div className={styles.navigationButtons}>
          <button
            type="button"
            onClick={onBack}
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSweepWave}`}
          >
            Back
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
          >
            Make Payment
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentStep;
