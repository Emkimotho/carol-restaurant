// File: components/dashboard/DriverConsole/OnlineToggle.tsx
'use client';

import React from 'react';
import styles from '@/app/dashboard/driver-dashboard/driver.module.css';
import { useDriverStatus } from './useDriverStatus';

interface Props {
  driverId: number;
  onStatusChange?: (online: boolean) => void;
}

export default function OnlineToggle({ driverId, onStatusChange }: Props) {
  const { online, isValidating, error, toggleOnline } = useDriverStatus(driverId);

  if (error) return <div className={styles.error}>Error loading status</div>;

  const handleClick = async () => {
    try {
      const newStatus = await toggleOnline();
      onStatusChange?.(newStatus);
    } catch {
      alert('Could not update your status. Please try again.');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isValidating}
      className={[
        styles.toggleButton,
        online ? styles.online : styles.offline,
        isValidating ? styles.loading : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isValidating ? '…' : online ? 'Go Offline' : 'Go Online'}
    </button>
  );
}
