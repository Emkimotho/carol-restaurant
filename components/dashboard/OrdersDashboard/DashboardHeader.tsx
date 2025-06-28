// File: components/dashboard/OrdersDashboard/DashboardHeader.tsx

import React from 'react';
import styles from './DashboardHeader.module.css';

interface DashboardHeaderProps {
  role: 'admin' | 'staff' | 'server' | 'cashier';
  tipTotal: number;
}

export default function DashboardHeader({ role, tipTotal }: DashboardHeaderProps) {
  const title =
    role === 'admin'
      ? 'Kitchen / Admin'
      : role === 'staff'
      ? 'Kitchen / Staff'
      : role === 'server'
      ? 'Server Dashboard'
      : 'Cashier Panel';

  return (
    <header className={styles.headerContainer}>
      <h1 className={styles.title}>{title}</h1>
      {role === 'staff' && (
        <div className={styles.tipsWidget}>
          <strong>Your Tips:</strong> ${tipTotal.toFixed(2)}
        </div>
      )}
    </header>
  );
}
