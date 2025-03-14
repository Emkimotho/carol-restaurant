// File: components/checkout/OrderTypeStep.tsx
"use client";

import React, { useContext } from 'react';
import styles from '@/app/checkout/Checkout.module.css';
import { OrderContext } from '@/contexts/OrderContext';

interface OrderTypeStepProps {
  orderType: string;
  onSelectOrderType: (orderType: string) => void; 
  onNext: () => void;
  onBack: () => void;
}

const OrderTypeStep: React.FC<OrderTypeStepProps> = ({
  orderType,
  onSelectOrderType,
  onNext,
  onBack,
}) => {
  // Optionally get the context if you want to store it directly here:
  const { order, setOrder } = useContext(OrderContext)!;

  const handleSelect = (type: string) => {
    // 1) Update local state in parent flow
    onSelectOrderType(type);

    // 2) Also set in OrderContext
    setOrder({
      ...order,
      orderType: type, // i.e. "pickup" or "delivery"
    });
  };

  return (
    <div className={styles.checkoutSection}>
      <h4>Select Order Type</h4>
      <div className={styles.orderTypeOptions}>
        <button
          className={`${styles.btn} ${
            orderType === 'pickup' ? styles.btnPrimary : styles.btnOutlinePrimary
          }`}
          onClick={() => handleSelect('pickup')}
        >
          Pickup
        </button>
        <button
          className={`${styles.btn} ${
            orderType === 'delivery' ? styles.btnPrimary : styles.btnOutlinePrimary
          }`}
          onClick={() => handleSelect('delivery')}
        >
          Delivery
        </button>
      </div>

      {/* Show pickup location if chosen */}
      {orderType === 'pickup' && (
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
