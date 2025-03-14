// components/checkout/DeliveryAddressStep.tsx
import React from 'react';
import styles from '@/app/checkout/Checkout.module.css';

interface DeliveryAddressProps {
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onBack: () => void;
}

const DeliveryAddressStep: React.FC<DeliveryAddressProps> = ({
  deliveryAddress,
  onChange,
  onNext,
  onBack,
}) => {
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
            value={deliveryAddress.street}
            onChange={onChange}
            className={styles.formControl}
            required
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
            value={deliveryAddress.city}
            onChange={onChange}
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
              value={deliveryAddress.state}
              onChange={onChange}
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
              value={deliveryAddress.zipCode}
              onChange={onChange}
              className={styles.formControl}
              required
            />
          </div>
        </div>
      </form>
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

export default DeliveryAddressStep;
