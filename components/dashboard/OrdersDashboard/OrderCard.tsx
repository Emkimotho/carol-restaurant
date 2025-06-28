// File: components/dashboard/OrdersDashboard/OrderCard.tsx
// ───────────────────────────────────────────────────────────────────────
// One order card: header badges • body summary • driver-assigner • actions
// ───────────────────────────────────────────────────────────────────────

'use client';

import React from 'react';
import type { Order } from './types';
import styles from './OrderCard.module.css';

import ScheduleBadge from './ScheduleBadge';
import OrderActions from './OrderActions';
import DriverAssigner, { Driver } from './DriverAssigner';

export interface OrderCardProps {
  order: Order;
  role: 'admin' | 'staff' | 'server' | 'cashier';
  drivers: Driver[];
  mutate: () => void;
  onShowDetail: () => void;
  onShowAgePatch: (nextStatus: string, msg: string) => void;
}

export default function OrderCard({
  order,
  role,
  drivers,
  mutate,
  onShowDetail,
  onShowAgePatch,
}: OrderCardProps) {
  // Assign or unassign driver via specialized route
  const assignDriver = async (driverId: number | null) => {
    await fetch(`/api/orders/${order.id}/driver`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    mutate();
  };

  const unassignDriver = () => {
    if (
      order.status !== 'DELIVERED' &&
      order.status !== 'CANCELLED'
    ) {
      assignDriver(null);
    }
  };

  const firstItem = order.items?.[0] ?? {};

  return (
    <div className={styles.card}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <span className={styles.orderId}>#{order.orderId}</span>
        <ScheduleBadge order={order} />

        {(order.deliveryType === 'ON_COURSE' ||
          order.deliveryType === 'EVENT_PAVILION') && (
          <span className={styles.golfBadge}>⛳ Golf</span>
        )}

        {order.paymentMethod === 'CASH' && (
          <span className={styles.cashBadge}>💵 Cash</span>
        )}

        {order.containsAlcohol && (
          <span className={styles.alcoholBadge}>🍺 Alcohol</span>
        )}

        <span
          className={`${styles.badge} ${styles[order.status]}`}
        >
          {order.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Body */}
      <div className={styles.cardBody}>
        <p>
          <strong>Main:</strong>{' '}
          {firstItem.title || firstItem.name || '—'}
        </p>
        {firstItem.description && (
          <p className={styles.itemDesc}>
            {firstItem.description}
          </p>
        )}

        {order.deliveryType === 'ON_COURSE' && (
          <p>
            <small>⛳ Hole {order.holeNumber ?? '—'}</small>
          </p>
        )}
        {order.deliveryType === 'EVENT_PAVILION' && (
          <p>
            <small>🏛 Pavilion Delivery</small>
          </p>
        )}
        {order.deliveryType === 'PICKUP_AT_CLUBHOUSE' && (
          <p>
            <small>🏠 Clubhouse Pickup</small>
          </p>
        )}

        {(order.guestName || order.customer) && (
          <p className={styles.driverTag}>
            <small>
              {order.guestName ??
                `${order.customer?.firstName} ${order.customer?.lastName}`}
            </small>
          </p>
        )}
        {order.driver && (
          <p className={styles.driverTag}>
            <small>
              Driver: {order.driver.firstName}{' '}
              {order.driver.lastName}
            </small>
          </p>
        )}
        {order.staff && (
          <p className={styles.driverTag}>
            <small>
              Staff: {order.staff.firstName}{' '}
              {order.staff.lastName}
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

      {/* Driver Assigner (admin/staff) */}
      {(role === 'admin' || role === 'staff') &&
        order.status !== 'DELIVERED' &&
        order.status !== 'CANCELLED' && (
          <DriverAssigner
            orderId={order.id}
            currentDriverId={order.driver?.id ?? null}
            drivers={drivers}
            onAssign={assignDriver}
            onUnassign={unassignDriver}
          />
      )}

      {/* Actions */}
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
