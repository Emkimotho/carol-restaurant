// File: components/dashboard/OrdersDashboard/ScheduleBadge.tsx
// ───────────────────────────────────────────────────────────────────────
// “ASAP” or “Scheduled · T-XXm” badge for orders
// ───────────────────────────────────────────────────────────────────────

'use client';

import React from 'react';
import type { Order } from './types';
import styles from './ScheduleBadge.module.css';

interface ScheduleBadgeProps {
  order: Order;
}

export default function ScheduleBadge({ order }: ScheduleBadgeProps) {
  if (!order.schedule) {
    return (
      <span className={`${styles.scheduleBadge} ${styles.scheduleASAP}`}>
        ASAP
      </span>
    );
  }
  // Compute minutes until scheduled time
  const now = Date.now();
  const then = new Date(order.schedule).getTime();
  const mins = Math.max(0, Math.floor((then - now) / 60000));

  return (
    <span className={`${styles.scheduleBadge} ${styles.scheduleScheduled}`}>
      {mins > 0 ? `Scheduled · T-${mins}m` : 'Scheduled'}
    </span>
  );
}
