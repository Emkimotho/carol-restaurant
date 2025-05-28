// File: components/dashboard/ScheduleBadge.tsx
// ─ “ASAP” or “Scheduled · T-XXm”
import React from 'react';
import styles from './orders.module.css';
import { Order } from './OrdersDashboard';

export default function ScheduleBadge({ order }: { order: Order }) {
  if (!order.schedule) {
    return <span className={`${styles.scheduleBadge} ${styles.scheduleASAP}`}>ASAP</span>;
  }
  const mins = Math.max(
    0,
    Math.floor((new Date(order.schedule).getTime() - Date.now()) / 60000)
  );
  return (
    <span className={`${styles.scheduleBadge} ${styles.scheduleScheduled}`}>
      {mins>0 ? `Scheduled · T-${mins}m` : 'Scheduled'}
    </span>
  );
}
