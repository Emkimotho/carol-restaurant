// components/checkout/GuestDetails.tsx
import React from 'react';
import styles from '@/app/checkout/Checkout.module.css';

interface GuestDetailsProps {
  guestDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
}

const GuestDetails: React.FC<GuestDetailsProps> = ({ guestDetails, onChange, onNext }) => {
  return (
    <div className={styles.checkoutSection}>
      <h4>Guest Details</h4>
      <form>
        <div className={styles.formGroup}>
          <label htmlFor="firstName">
            First Name<span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="firstName"
            id="firstName"
            value={guestDetails.firstName}
            onChange={onChange}
            className={styles.formControl}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="lastName">
            Last Name<span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            name="lastName"
            id="lastName"
            value={guestDetails.lastName}
            onChange={onChange}
            className={styles.formControl}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="email">
            Email Address<span className={styles.required}>*</span>
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={guestDetails.email}
            onChange={onChange}
            className={styles.formControl}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="phone">
            Phone Number<span className={styles.required}>*</span>
          </label>
          <input
            type="tel"
            name="phone"
            id="phone"
            value={guestDetails.phone}
            onChange={onChange}
            className={styles.formControl}
            placeholder="(XXX) XXX-XXXX"
            required
          />
        </div>
      </form>
      <div className={styles.navigationButtons}>
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

export default GuestDetails;
