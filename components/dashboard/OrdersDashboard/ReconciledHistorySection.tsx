// File: components/dashboard/OrdersDashboard/ReconciledHistorySection.tsx
// Renders a table of past cash‐collection records for the cashier view,
// displaying the human‐friendly order code on top and the record UUID below,
// along with amount and collection timestamp.

import React from 'react';
import styles from './ReconciledHistorySection.module.css';
import type { CashCollectionRecord } from './types';

interface ReconciledHistorySectionProps {
  /** Array of cash‐collection records; each may include an embedded order with its friendly code */
  reconciledRecords: Array<
    CashCollectionRecord & {
      order?: { orderId: string };
    }
  >;
}

export default function ReconciledHistorySection({
  reconciledRecords,
}: ReconciledHistorySectionProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Reconciliation History</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Amount ($)</th>
            <th>Collected At</th>
          </tr>
        </thead>
        <tbody>
          {reconciledRecords.length > 0 ? (
            reconciledRecords.map((r) => {
              // If the record carries the richer Payout shape, use its embedded orderId;
              // otherwise fall back to the record's own orderId field.
              const friendly = r.order?.orderId ?? r.orderId;
              return (
                <tr key={r.id}>
                  <td className={styles.cell}>
                    <div>{friendly}</div>
                    <div className={styles.small}>{r.id}</div>
                  </td>
                  <td className={styles.cell}>{r.amount.toFixed(2)}</td>
                  <td className={styles.cell}>
                    {r.collectedAt
                      ? new Date(r.collectedAt).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3} className={styles.empty}>
                No reconciled records.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
