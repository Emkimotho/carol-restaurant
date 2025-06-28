// File: components/dashboard/OrdersDashboard/StatementView.tsx
'use client';

import React from 'react';
import styles from './StatementView.module.css';
import type { Order } from './types';

// reuse your money/date helpers or inline
const money = (n?: number) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const pretty = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' });

export interface StatementViewProps {
  list: Order[];
  onShowDetail: (order: Order) => void;
}

export default function StatementView({
  list,
  onShowDetail,
}: StatementViewProps) {
  if (!list.length) {
    return <p className={styles.empty}>No delivered orders to show.</p>;
  }

  return (
    <div className={styles.statement}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Order #</th>
            <th>Seat/Hole</th>
            <th>Total</th>
            <th>Tip</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {list.map((o) => (
            <tr key={o.orderId}>
              <td>{pretty(o.createdAt)}</td>
              <td>{o.orderId}</td>
              <td>{o.holeNumber != null ? o.holeNumber : '—'}</td>
              <td>{money(o.totalAmount)}</td>
              <td>{money(o.tipAmount)}</td>
              <td>
                <button
                  className={styles.detailBtn}
                  onClick={() => onShowDetail(o)}
                >
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
