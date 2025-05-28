// File: components/dashboard/AgeCheckModal.tsx
// ─ “Confirm you’re 21+” modal for alcohol orders.
import React from 'react';
import Ordersmodal from './Ordersmodal';
import styles from './orders.module.css';
import { OrderStatus } from '@prisma/client';
import type { Order } from './OrdersDashboard';

export interface AgeCheckModalProps {
  isOpen: boolean;
  patch: { order: Order; nextStatus: string; msg: string } | null;
  onClose: () => void;
  onDone: () => void;
}

export default function AgeCheckModal({
  isOpen, patch, onClose, onDone
}: AgeCheckModalProps) {
  if (!isOpen || !patch) return null;

  const { order, nextStatus, msg } = patch;

  const confirm = async () => {
    // proceed with patch
    await fetch(`/api/orders/${order.id}`, {
      method:'PATCH', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ status: nextStatus }),
    });
    onDone();
    onClose();
  };

  return (
    <Ordersmodal isOpen={isOpen} title="Age Verification" onClose={onClose}>
      <p>⚠️ This order contains alcohol. Confirm you’re at least 21 years old to proceed.</p>
      <div className={styles.modalFooter}>
        <button className={styles.actionBtn} onClick={confirm}>
          I’m 21+
        </button>
        <button className={styles.deleteBtn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Ordersmodal>
  );
}
