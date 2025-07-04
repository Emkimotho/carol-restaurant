// File: components/dashboard/OrdersDashboard/StatementView.tsx
'use client';

/* =======================================================================
   StatementView  – Plain table that lists completed (or any filtered)
                    orders and, when `isAdmin` is true, shows a Delete
                    button per row.
   Props
   ────────────────────────────────────────────────────────────────────────
   list        Order[]          – array already filtered by the parent
   onShowDetail(order)          – opens the modal / drawer
   isAdmin     boolean = false  – toggle Delete column
   onDeleted(id)                – callback so parent can mutate() / refetch
   ======================================================================= */

import React from 'react';
import styles from './StatementView.module.css';
import type { Order } from './types';

/* Local helpers – keep it simple, reuse your money/date utils if you have them */
const money  = (n?: number) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const pretty = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { dateStyle: 'medium' });

/* ───────────────────────── Component ───────────────────────── */
export interface StatementViewProps {
  list: Order[];
  onShowDetail: (order: Order) => void;
  isAdmin?: boolean;
  onDeleted?: (id: string) => void;
}

export default function StatementView({
  list,
  onShowDetail,
  isAdmin = false,
  onDeleted,
}: StatementViewProps) {
  /* ---------- 1) Early-out: nothing to show ---------- */
  if (!list.length) {
    return <p className={styles.empty}>No orders to show.</p>;
  }

  /* ---------- 2) Fire DELETE /api/orders/:id ---------- */
  const handleDelete = async (o: Order) => {
    if (!confirm(`Really delete order ${o.orderId}?`)) return;

    const res = await fetch(`/api/orders/${o.id}`, { method: 'DELETE' });

    if (res.ok) {
      /* 204 → success. Let parent refetch or locally filter row out */
      onDeleted?.(o.id);
    } else {
      /* Surface server-side error to the admin */
      const { error } = await res.json();
      alert(error ?? 'Delete failed – check console');
    }
  };

  /* ---------- 3) Render table ---------- */
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
            {isAdmin && <th>Delete</th>}
          </tr>
        </thead>

        <tbody>
          {list.map((o) => (
            <tr key={o.orderId}>
              <td>{pretty(o.createdAt)}</td>
              <td>{o.orderId}</td>
              <td>{o.holeNumber ?? '—'}</td>
              <td>{money(o.totalAmount)}</td>
              <td>{money(o.tipAmount)}</td>

              {/* Detail button – unchanged */}
              <td>
                <button
                  className={styles.detailBtn}
                  onClick={() => onShowDetail(o)}
                >
                  Details
                </button>
              </td>

              {/* Delete column – admin-only */}
              {isAdmin && (
                <td>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(o)}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
