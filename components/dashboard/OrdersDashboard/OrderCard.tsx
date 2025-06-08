// File: components/dashboard/OrdersDashboard/OrderCard.tsx
// ───────────────────────────────────────────────────────────────────────
// One order card: header badges • body summary • driver-assigner • actions
// ───────────────────────────────────────────────────────────────────────

'use client';

import React from 'react';
import { Order } from './OrdersDashboard';
import styles from './orders.module.css';
import ScheduleBadge from './ScheduleBadge';
import OrderActions from './OrderActions';
import DriverAssigner, { Driver } from './DriverAssigner';

export interface OrderCardProps {
  order: Order & { driverId?: number | null };
  role: 'admin' | 'staff' | 'server' | 'cashier';
  mutate: () => void;
  onShowDetail: () => void;
  onShowAgePatch: (nextStatus: string, msg: string) => void;
  drivers: Driver[];
}

export default function OrderCard({
  order,
  role,
  mutate,
  onShowDetail,
  onShowAgePatch,
  drivers,
}: OrderCardProps) {
  /* ---------- API helpers ---------- */
  const assignDriver = async (driverId: number) => {
    await fetch(`/api/orders/${order.id}/driver`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    mutate();
  };

  const unassignDriver = async () => {
    if (order.status === 'DELIVERED' || order.status === 'CANCELLED') return;
    await fetch(`/api/orders/${order.id}/driver`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: null, nextStatus: 'ORDER_READY' }),
    });
    mutate();
  };

  /* ---------- first line-item ---------- */
  const first = order.items[0] || {};

  return (
    <div className={styles.card}>
      {/* ── Header ── */}
      <div className={styles.cardHeader}>
        <span className={styles.orderId}>#{order.orderId}</span>
        <ScheduleBadge order={order} />

        {(order.holeNumber != null || order.deliveryType === 'EVENT') && (
          <span className={styles.golfBadge}>⛳ Golf</span>
        )}
        {order.paymentMethod === 'CASH' && (
          <span className={styles.cashBadge}>💵 Cash</span>
        )}
        {order.containsAlcohol && (
          <span className={styles.alcoholBadge}>🍺 Alcohol</span>
        )}

        <span className={`${styles.badge} ${styles[order.status]}`}>
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* ── Body ── */}
      <div className={styles.cardBody}>
        <p>
          <strong>Main:</strong> {first.title || first.name || '—'}
        </p>
        {first.description && (
          <p className={styles.itemDesc}>{first.description}</p>
        )}

        {(order.guestName || order.customer) && (
          <p className={styles.driverTag}>
            <small>
              {order.guestName ||
                `${order.customer?.firstName} ${order.customer?.lastName}`}
            </small>
          </p>
        )}

        {order.driver && (
          <p className={styles.driverTag}>
            <small>
              Driver: {order.driver.firstName} {order.driver.lastName}
            </small>
          </p>
        )}

        {order.staff && (
          <p className={styles.driverTag}>
            <small>
              Staff: {order.staff.firstName} {order.staff.lastName}
            </small>
          </p>
        )}

        {order.cashCollection?.server && (
          <p className={styles.driverTag}>
            <small>
              Server: {order.cashCollection.server.firstName}{' '}
              {order.cashCollection.server.lastName}
            </small>
          </p>
        )}
      </div>

      {/* ── Driver assignment ── */}
      {(role === 'admin' || role === 'staff') && (
        order.status !== 'DELIVERED' &&
        order.status !== 'CANCELLED' && (
          <DriverAssigner
            orderId={order.id}
            currentDriverId={order.driverId ?? null}
            drivers={drivers}
            onAssign={assignDriver}
            onUnassign={unassignDriver}
          />
        )
      )}

      {/* ── Footer actions ── */}
      <OrderActions
        order={order}
        role={role}
        mutate={mutate}
        onShowDetail={onShowDetail}
        onShowAgePatch={onShowAgePatch}
      />
    </div>
  );
}
