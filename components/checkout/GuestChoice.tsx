import React from 'react';
import styles from '@/components/checkout/GuestChoice.module.css';

interface GuestChoiceProps {
  onSelect: (isGuest: boolean) => void;
}

const GuestChoice: React.FC<GuestChoiceProps> = ({ onSelect }) => {
  return (
    <div className={styles.guestChoiceContainer}>
      <h4 className={styles.guestChoiceTitle}>Welcome to Checkout</h4>
      <p className={styles.guestChoiceIntro}>
        Please choose an option to proceed:
      </p>
      <div className={styles.guestChoiceButtons}>
        <button
          onClick={() => onSelect(false)}
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
        >
          Login
        </button>
        <button
          onClick={() => onSelect(true)}
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSweepWave}`}
        >
          Checkout as Guest
        </button>
      </div>
    </div>
  );
};

export default GuestChoice;
