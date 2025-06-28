// File: components/dashboard/OrdersDashboard/CashReconciliationSection.tsx

import React from 'react';
import styles from './CashReconciliationSection.module.css';
import type { Order } from './types';

interface CashReconciliationSectionProps {
  toReconcile: Order[];
  cashInput: string;
  onCashInputChange: (value: string) => void;
  diff: number;
  expectedTotal: number;
  onReconcile: () => void;
}

export default function CashReconciliationSection({
  toReconcile,
  cashInput,
  onCashInputChange,
  diff,
  expectedTotal,
  onReconcile,
}: CashReconciliationSectionProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Cash Reconciliation</h2>
      <p className={styles.info}>Pending orders: {toReconcile.length}</p>
      <p className={styles.info}>Total cash amount: ${expectedTotal.toFixed(2)}</p>

      <label className={styles.label}>
        Enter cash received:
        <input
          type="number"
          value={cashInput}
          onChange={e => onCashInputChange(e.target.value)}
          className={styles.input}
        />
      </label>

      {cashInput && (
        <p className={styles.hint}>
          {diff < 0 && <>⚠️ Short by ${Math.abs(diff).toFixed(2)}</>}
          {diff === 0 && <>✅ Exact amount received</>}
          {diff > 0 && <>💵 Change due: ${diff.toFixed(2)}</>}
        </p>
      )}

      <button
        onClick={onReconcile}
        disabled={cashInput === '' || diff < 0 || toReconcile.length === 0}
        className={styles.button}
      >
        Reconcile
      </button>
    </div>
  );
}
