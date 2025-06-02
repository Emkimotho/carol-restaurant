// File: components/dashboard/OrderActions.tsx
// ───────────────────────────────────────────────────────────────────────
// Renders each card’s action buttons, including:
//  • Two‑step flow for servers:
//      1) Pick Up & En Route   (ORDER_READY → PICKED_UP_BY_DRIVER)
//      2) Collect Cash & Complete   (cash)  or  Mark Delivered (card)
//  • Prep / Cancel for staff & admin
//  • Details (all roles) and Delete (admin)
// ───────────────────────────────────────────────────────────────────────

import React from 'react';
import { toast } from 'react-toastify';
import styles from './orders.module.css';
import { Order } from './OrdersDashboard';
import { OrderStatus } from '@prisma/client';

export interface OrderActionsProps {
  order: Order;
  role: 'admin' | 'staff' | 'server' | 'cashier';
  mutate: () => void;
  onShowDetail: () => void;
  onShowAgePatch: (nextStatus: string, msg: string) => void;
}

// Chef/admin prep/ready transitions
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  ORDER_RECEIVED: OrderStatus.IN_PROGRESS,
  IN_PROGRESS:    OrderStatus.ORDER_READY,
};

// which statuses can be cancelled
const canCancel = (s: OrderStatus) =>
  s === OrderStatus.ORDER_RECEIVED || s === OrderStatus.IN_PROGRESS;

export default function OrderActions({
  order,
  role,
  mutate,
  onShowDetail,
  onShowAgePatch
}: OrderActionsProps) {
  const patchOrder = async (nextStatus: string, msg: string) => {
    const t = toast.loading(msg);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      toast.update(t, { render: 'Success', type: 'success', isLoading: false, autoClose: 1200 });
    } catch (e: any) {
      toast.update(t, { render: e.message, type: 'error', isLoading: false });
    }
  };

  const deleteOrder = async () => {
    if (role !== 'admin' || !confirm('Delete permanently?')) return;
    const t = toast.loading('Deleting…');
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      toast.update(t, { render: 'Deleted', type: 'success', isLoading: false, autoClose: 1200 });
    } catch (e: any) {
      toast.update(t, { render: e.message, type: 'error', isLoading: false });
    }
  };

  return (
    <div className={styles.cardFooter}>
      {/* Staff & Admin: Start Prep / Mark Ready */}
      {(role === 'staff' || role === 'admin') && order.status in NEXT && (
        <button
          className={styles.actionBtn}
          onClick={() => {
            const next = NEXT[order.status as OrderStatus]!;
            const msg  = order.status === OrderStatus.ORDER_RECEIVED
              ? 'Starting prep…'
              : 'Marking ready…';
            if (order.containsAlcohol) {
              onShowAgePatch(next, msg);
            } else {
              patchOrder(next, msg);
            }
          }}
        >
          {order.status === OrderStatus.ORDER_RECEIVED ? 'Start Prep' : 'Mark Ready'}
        </button>
      )}

      {/* Staff & Admin: Cancel */}
      {(role === 'staff' || role === 'admin') && canCancel(order.status as OrderStatus) && (
        <button
          className={styles.actionBtn}
          onClick={() => patchOrder(OrderStatus.CANCELLED, 'Cancelling…')}
        >
          Cancel
        </button>
      )}

      {/* ─────────────  SERVER FLOW  ───────────── */}

      {/* Step 1: Pick Up & En Route — always on ORDER_READY */}
      {role === 'server' && order.status === OrderStatus.ORDER_READY && (
        <button
          className={styles.actionBtn}
          onClick={() =>
            patchOrder(
              OrderStatus.PICKED_UP_BY_DRIVER,
              'Picking up & en route…'
            )
          }
        >
          Pick Up & En Route
        </button>
      )}

      {/* Step 2A: Collect Cash & Complete — cash + picked up */}
      {role === 'server' &&
       order.paymentMethod === 'CASH' &&
       order.status === OrderStatus.PICKED_UP_BY_DRIVER && (
        <button
          className={styles.actionBtn}
          onClick={() =>
            patchOrder(
              OrderStatus.DELIVERED,
              'Collecting cash & completing…'
            )
          }
        >
          Collect Cash & Complete
        </button>
      )}

      {/* Step 2B: Mark Delivered — card + picked up */}
      {role === 'server' &&
       order.paymentMethod === 'CARD' &&
       order.status === OrderStatus.PICKED_UP_BY_DRIVER && (
        <button
          className={styles.actionBtn}
          onClick={() => patchOrder(OrderStatus.DELIVERED, 'Marking delivered…')}
        >
          Mark Delivered
        </button>
      )}

      {/* Details (all roles) */}
      <button className={styles.actionBtn} onClick={onShowDetail}>
        Details
      </button>

      {/* Admin: Delete */}
      {role === 'admin' && (
        <button className={styles.deleteBtn} onClick={deleteOrder}>
          Delete
        </button>
      )}
    </div>
  );
}
