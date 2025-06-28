// File: components/dashboard/OrdersDashboard/PendingCashSection.tsx
// Renders the server’s pending‐cash orders in a table,
// showing friendly order code plus the record UUID, amount, and when it will be collected.

import React from 'react';
import styles from './PendingCashSection.module.css';
import type { CashCollectionRecord } from './types';

interface PendingCashSectionProps {
  /** Array of pending cash‐collection records; each may include an embedded order with its friendly code */
  pendingCash: Array<
    CashCollectionRecord & {
      order?: { orderId: string };
    }
  >;
}

export default function PendingCashSection({
  pendingCash,
}: PendingCashSectionProps) {
  const total = pendingCash.reduce((sum, c) => sum + c.amount, 0).toFixed(2);

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Your Pending Cash Orders</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Amount ($)</th>
            <th>Collected At</th>
          </tr>
        </thead>
        <tbody>
          {pendingCash.length > 0 ? (
            pendingCash.map((c) => {
              const friendly = c.order?.orderId ?? c.orderId;
              return (
                <tr key={c.id}>
                  <td className={styles.cell}>
                    <div>{friendly}</div>
                    <div className={styles.small}>{c.id}</div>
                  </td>
                  <td className={styles.cell}>{c.amount.toFixed(2)}</td>
                  <td className={styles.cell}>
                    {c.collectedAt ? new Date(c.collectedAt).toLocaleString() : '—'}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3} className={styles.empty}>
                No pending cash orders to reconcile.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className={styles.total}>
        <strong>Total Pending:</strong> ${total}
      </p>
    </div>
  );
}
