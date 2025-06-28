// File: components/dashboard/OrdersDashboard/OrdersGridWrapper.tsx
'use client';

import React from 'react';
import OrdersGrid       from './OrdersGrid';
import type { Order }   from './types';
import type { Driver }  from './DriverAssigner';
import type { TabKey }  from './OrdersTabs';
import styles           from './OrdersGridWrapper.module.css';

interface OrdersGridWrapperProps {
  /** Which dashboard is rendering the grid */
  role:
    | 'admin'
    | 'staff'
    | 'staffMine'
    | 'server'
    | 'cashier'
    | 'driver'
    | 'driverMine';

  /** Current tab key (depends on dashboard) */
  tab: TabKey;

  /** List of orders already filtered by the parent hook */
  list: Order[];

  /** List of active drivers (for assign-dropdown) */
  drivers: Driver[];

  /** “Claim” / cash-collect buttons should use this ID on server view */
  serverId?: number;

  /** Which driver is “me” (for driver dashboards) */
  driverId?: number;

  /** SWR mutate forwarded so children can refresh */
  mutate: () => Promise<any>;

  /** Show order-detail drawer/modal */
  onShowDetail: (order: Order) => void;

  /** Show age-verification override dialog */
  onShowAgePatch: (patch: { order: Order; nextStatus: string; msg: string }) => void;
}

/**
 * Conditionally hides the shared grid when a tab
 * has its own dedicated view (pending cash, reconciliation,
 * or statement mode), otherwise renders <OrdersGrid>.
 */
export default function OrdersGridWrapper({
  role,
  tab,
  list,
  drivers,
  serverId,
  driverId,
  mutate,
  onShowDetail,
  onShowAgePatch,
}: OrdersGridWrapperProps) {
  const hideGrid =
    // server’s “Pending Cash” tab is its own section
    (role === 'server'  && tab === 'pendingCash')  ||
    // cashier’s reconciliation tabs are separate
    (role === 'cashier' && (tab === 'toReconcile' || tab === 'reconciled')) ||
    // delivered/completed are handled by StatementView
    (tab === 'delivered' || tab === 'completed');

  if (hideGrid) return null;

  return (
    <div className={styles.ordersGridWrapper}>
      <OrdersGrid
        list={list}
        role={role}
        drivers={drivers}
        serverId={serverId}
        driverId={driverId}
        mutate={mutate}
        onShowDetail={onShowDetail}
        onShowAgePatch={onShowAgePatch}
      />
    </div>
  );
}
