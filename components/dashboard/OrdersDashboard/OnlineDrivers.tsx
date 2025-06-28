// File: components/dashboard/OrdersDashboard/OnlineDrivers.tsx

import React from 'react';
import styles from './OnlineDrivers.module.css';
import type { Driver } from './DriverAssigner';

interface OnlineDriversProps {
  drivers: Driver[];
}

export default function OnlineDrivers({ drivers }: OnlineDriversProps) {
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>🟢 Online Drivers ({drivers.length})</h2>
      <ul className={styles.list}>
        {drivers.length > 0 ? (
          drivers.map(d => (
            <li key={d.id} className={styles.item}>
              {d.firstName} {d.lastName}
            </li>
          ))
        ) : (
          <li className={styles.empty}><em>No drivers online</em></li>
        )}
      </ul>
    </div>
  );
}
