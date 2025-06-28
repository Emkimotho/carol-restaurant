// File: components/dashboard/OrdersDashboard/OrdersTabs.tsx
// ───────────────────────────────────────────────────────────────────────
// Renders a dynamic set of tabs with counts, highlighting the active one.
// ───────────────────────────────────────────────────────────────────────

'use client';

import React from 'react';
import styles from './OrdersTabs.module.css';

// Union of every tab key we might use
export type TabKey =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'received'
  | 'inPrep'
  | 'ready'
  | 'enRoute'
  | 'delivered'
  | 'toReconcile'
  | 'reconciled'
  | 'pendingCash';

export interface Tab {
  key: TabKey;
  label: string;
  count: number;
}

export interface OrdersTabsProps {
  tabs: Tab[];
  current: TabKey;
  onChange: (key: TabKey) => void;
}

export default function OrdersTabs({
  tabs,
  current,
  onChange,
}: OrdersTabsProps) {
  return (
    <div className={styles.tabs}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`${styles.tab} ${tab.key === current ? styles.activeTab : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}
