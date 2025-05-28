// File: components/dashboard/OrdersTabs.tsx
// ───────────────────────────────────────────────────────────────────────
// Renders a dynamic set of tabs with counts, highlighting the active one.
//
// Keys are a union of all possible tabs across roles.
// Display labels can be anything—spaces, capitalization, etc.
// ───────────────────────────────────────────────────────────────────────

import React from 'react';
import styles from './orders.module.css';

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
  | 'reconciled';

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
          className={tab.key === current ? styles.activeTab : ''}
          onClick={() => onChange(tab.key)}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}
