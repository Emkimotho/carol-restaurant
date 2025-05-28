// File: components/dashboard/OrdersDashboard/OrdersGrid.tsx
// ─ Maps the filtered list → OrderCard, forwarding drivers list for assignment.
'use client';

import React from 'react';
import { Order } from './OrdersDashboard';
import styles from './orders.module.css';
import OrderCard from './OrderCard';
import type { Driver } from './DriverAssigner';

export interface OrdersGridProps {
  list: Order[];
  role: 'admin' | 'staff' | 'server' | 'cashier';
  drivers: Driver[]; // list of available drivers
  mutate: () => void;
  onShowDetail: (o: Order) => void;
  onShowAgePatch: (patch: { order: Order; nextStatus: string; msg: string }) => void;
}

export default function OrdersGrid({
  list,
  role,
  drivers,
  mutate,
  onShowDetail,
  onShowAgePatch,
}: OrdersGridProps) {
  return (
    <div className={styles.ordersGrid}>
      {list.map(o => (
        <OrderCard
          key={o.id}
          order={o}
          role={role}
          drivers={drivers}
          mutate={mutate}
          onShowDetail={() => onShowDetail(o)}
          onShowAgePatch={(nextStatus, msg) => onShowAgePatch({ order: o, nextStatus, msg })}
        />
      ))}
    </div>
  );
}
