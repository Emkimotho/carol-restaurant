// File: components/dashboard/OrdersDashboard/OrderActions.tsx
// ───────────────────────────────────────────────────────────────────────
// Renders each card’s action buttons:
//  • Two-step flow for servers:
//      1) Pick Up & En Route   (ORDER_READY → PICKED_UP_BY_DRIVER)
//      2) Collect Cash & Complete   (cash)  or  Mark Delivered (card)
//  • Prep / Cancel for staff & admin (with scheduled-order guard only on Start Prep)
//  • Details (all roles) and Delete (admin)
// ───────────────────────────────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from './OrderActions.module.css';
import type { Order } from './types';
import { OrderStatus, DeliveryType } from '@prisma/client';

export interface OrderActionsProps {
  order: Order;
  role: 'admin' | 'staff' | 'server' | 'cashier';
  mutate: () => void;
  onShowDetail: () => void;
  onShowAgePatch: (nextStatus: string, msg: string) => void;
}

// Chef/admin prep→ready transitions
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  ORDER_RECEIVED: OrderStatus.IN_PROGRESS,
  IN_PROGRESS:    OrderStatus.ORDER_READY,
};

// Which statuses can be cancelled
function canCancel(status: OrderStatus) {
  return (
    status === OrderStatus.ORDER_RECEIVED ||
    status === OrderStatus.IN_PROGRESS
  );
}

// Confirmation modal for “start too early”
function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  isOpen:    boolean;
  title:     string;
  message:   string;
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className={styles.modalButtons}>
          <button onClick={onCancel} className={styles.btnOutline}>
            Cancel
          </button>
          <button onClick={onConfirm} className={styles.btnPrimary}>
            Start Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrderActions({
  order,
  role,
  mutate,
  onShowDetail,
  onShowAgePatch,
}: OrderActionsProps) {
  // No actions at all on clubhouse pick-up
  if (order.deliveryType === DeliveryType.PICKUP_AT_CLUBHOUSE) {
    return null;
  }

  const [modal, setModal] = useState<{
    open:       boolean;
    nextStatus: OrderStatus;
    scheduled:  Date;
  }>({
    open: false,
    nextStatus: OrderStatus.ORDER_RECEIVED,
    scheduled: new Date(),
  });

  const doPatch = async (nextStatus: OrderStatus, msg: string) => {
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
      toast.update(t, {
        render: 'Success',
        type: 'success',
        isLoading: false,
        autoClose: 1200,
      });
    } catch (e: any) {
      toast.update(t, {
        render: e.message,
        type: 'error',
        isLoading: false,
      });
    }
  };

  // Handle staff/admin “Start Prep” or “Mark Ready”
  const handleStart = () => {
    const next = NEXT_STATUS[order.status as OrderStatus]!;
    const msg  = order.status === OrderStatus.ORDER_RECEIVED
      ? 'Starting prep…'
      : 'Marking ready…';

    // age-check path
    if (order.containsAlcohol) {
      onShowAgePatch(next, msg);
      return;
    }

    // ONLY for the very first step (ORDER_RECEIVED → IN_PROGRESS) do we gate by schedule
    if (order.status === OrderStatus.ORDER_RECEIVED && order.schedule) {
      const scheduled = new Date(order.schedule);
      const diffMs    = scheduled.getTime() - Date.now();
      const fortyFive = 45 * 60 * 1000;
      if (diffMs > fortyFive) {
        const when = scheduled.toLocaleString('en-US', {
          weekday: 'short',
          month:   'short',
          day:     'numeric',
          hour:    'numeric',
          minute:  '2-digit',
        });
        toast.info(`Too early — scheduled for ${when}.`, { autoClose: 4000 });
        return;
      }
      // within 45m: confirm
      setModal({ open: true, nextStatus: next, scheduled });
      return;
    }

    // otherwise just go
    doPatch(next, msg);
  };

  const confirmStart = () => {
    const next = modal.nextStatus;
    const msg  = next === OrderStatus.IN_PROGRESS
      ? 'Starting prep…'
      : 'Marking ready…';
    doPatch(next, msg);
    setModal(m => ({ ...m, open: false }));
  };

  const handleDelete = async () => {
    if (role !== 'admin' || !window.confirm('Delete permanently?')) return;
    const t = toast.loading('Deleting…');
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      toast.update(t, {
        render: 'Deleted',
        type: 'success',
        isLoading: false,
        autoClose: 1200,
      });
    } catch (e: any) {
      toast.update(t, {
        render: e.message,
        type: 'error',
        isLoading: false,
      });
    }
  };

  return (
    <>
      <ConfirmModal
        isOpen={modal.open}
        title={`Scheduled for ${modal.scheduled.toLocaleString()}`}
        message="Are you sure you want to start now?"
        onConfirm={confirmStart}
        onCancel={() => setModal(m => ({ ...m, open: false }))}
      />

      <div className={styles.actions}>
        {/* Staff/Admin: Start Prep / Mark Ready */}
        {(role === 'staff' || role === 'admin') &&
          order.status in NEXT_STATUS && (
            <button className={styles.button} onClick={handleStart}>
              {order.status === OrderStatus.ORDER_RECEIVED
                ? 'Start Prep'
                : 'Mark Ready'}
            </button>
        )}

        {/* Staff/Admin: Cancel */}
        {(role === 'staff' || role === 'admin') &&
          canCancel(order.status as OrderStatus) && (
            <button
              className={styles.button}
              onClick={() =>
                doPatch(OrderStatus.CANCELLED, 'Cancelling…')
              }
            >
              Cancel
            </button>
        )}

        {/* Server: Pick Up & En Route */}
        {role === 'server' &&
          order.status === OrderStatus.ORDER_READY && (
            <button
              className={styles.button}
              onClick={() =>
                doPatch(
                  OrderStatus.PICKED_UP_BY_DRIVER,
                  'Picking up & en route…'
                )
              }
            >
              Pick Up & En Route
            </button>
        )}

        {/* Server: Complete flow */}
        {role === 'server' &&
          order.status === OrderStatus.PICKED_UP_BY_DRIVER && (
            order.paymentMethod === 'CASH' ? (
              <button
                className={styles.button}
                onClick={() =>
                  doPatch(
                    OrderStatus.DELIVERED,
                    'Collecting cash & completing…'
                  )
                }
              >
                Collect Cash & Complete
              </button>
            ) : (
              <button
                className={styles.button}
                onClick={() =>
                  doPatch(
                    OrderStatus.DELIVERED,
                    'Marking delivered…'
                  )
                }
              >
                Mark Delivered
              </button>
            )
        )}

        {/* Details */}
        <button className={styles.button} onClick={onShowDetail}>
          Details
        </button>

        {/* Admin: Delete */}
        {role === 'admin' && (
          <button
            className={styles.deleteButton}
            onClick={handleDelete}
          >
            Delete
          </button>
        )}
      </div>
    </>
  );
}
