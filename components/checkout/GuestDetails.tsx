// File: components/checkout/GuestDetails.tsx
'use client';

import React, { useContext, useEffect, useState } from 'react';
import styles from '@/components/checkout/GuestDetails.module.css';
import { OrderContext } from '@/contexts/OrderContext';

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

interface Field {
  id: 'firstName' | 'lastName' | 'email' | 'phone';
  label: string;
  type?: string;
}

const FIELDS: Field[] = [
  { id: 'firstName', label: 'First Name' },
  { id: 'lastName',  label: 'Last Name' },
  { id: 'email',     label: 'Email Address', type: 'email' },
  { id: 'phone',     label: 'Phone Number',  type: 'tel' },
];

const isFilled = (s: string) => s.trim().length > 0;

const GuestDetails: React.FC<GuestDetailsProps> = ({
  guestDetails,
  onChange,
  onNext,
}) => {
  const { setOrder } = useContext(OrderContext)!;
  const [local, setLocal] = useState(guestDetails);

  // if parent ever changes initial props, sync down
  useEffect(() => {
    setLocal(guestDetails);
  }, [guestDetails]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocal(prev => ({ ...prev, [name]: value }));
    onChange(e); // tell wizard

    // also write into OrderContext
    setOrder(prev => ({
      ...prev,
      guestName:
        name === 'firstName' || name === 'lastName'
          ? `${name === 'firstName' ? value : prev.guestName?.split(' ')[0] ?? ''} ${
             name === 'lastName'  ? value : prev.guestName?.split(' ')[1] ?? ''
            }`.trim()
          : prev.guestName,
      guestEmail: name === 'email' ? value : prev.guestEmail,
      guestPhone: name === 'phone' ? value : prev.guestPhone,
    }));
  };

  const canContinue = FIELDS.every(f => isFilled(local[f.id]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canContinue) onNext();
  };

  return (
    <div className={styles.checkoutSection}>
      <h4>Guest Details</h4>
      <form onSubmit={handleSubmit}>
        {FIELDS.map(({ id, label, type }) => (
          <div key={id} className={styles.formGroup}>
            <label htmlFor={id}>
              {label}<span className={styles.required}>*</span>
            </label>
            <input
              id={id}
              name={id}
              type={type || 'text'}
              value={(local as any)[id]}
              onChange={handleChange}
              className={styles.formControl}
              required
            />
          </div>
        ))}
        <div className={styles.navigationButtons}>
          <button
            type="submit"
            disabled={!canContinue}
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSweepWave}`}
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
};

export default GuestDetails;
