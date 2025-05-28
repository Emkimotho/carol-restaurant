"use client";

import React, { useContext } from "react";
import { useRouter } from "next/navigation"; // <<< CHANGED (new import)
import styles from "@/components/checkout/GuestChoice.module.css";
import { OrderContext } from "@/contexts/OrderContext";

/* The parent flow passes one callback */
interface GuestChoiceProps {
  onSelect: (isGuest: boolean) => void;
}

const GuestChoice: React.FC<GuestChoiceProps> = ({ onSelect }) => {
  const { order, setOrder } = useContext(OrderContext)!;
  const router = useRouter(); // <<< CHANGED (new hook)

  /* helper: apply decision in both Context *and* parent */
  const choose = (isGuest: boolean) => {
    setOrder((prev) => ({ ...prev, isGuestCheckout: isGuest }));
    onSelect(isGuest);
  };

  return (
    <div className={styles.guestChoiceContainer}>
      <h4 className={styles.guestChoiceTitle}>Welcome to Checkout</h4>
      <p className={styles.guestChoiceIntro}>
        Please choose an option to proceed:
      </p>

      <div className={styles.guestChoiceButtons}>
        <button
          type="button"
          onClick={() => {
            choose(false);
            router.push(
              `/login?redirect=${encodeURIComponent("/checkout")}`
            ); // <<< CHANGED – always send redirect
          }}
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
        >
          Login
        </button>

        <button
          type="button"
          onClick={() => choose(true)}
          className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSweepWave}`}
        >
          Checkout&nbsp;as&nbsp;Guest
        </button>
      </div>
    </div>
  );
};

export default GuestChoice;
