// File: components/dashboard/OrdersDashboard/DriverAssigner.tsx
/* =======================================================================
 * Tiny helper shown inside every card:
 *   • If a driver is already assigned → “Un-assign” button
 *   • Otherwise                     → <select> to pick a driver
 * ======================================================================= */

'use client';

import React from 'react';
// ⚠️ Make sure this matches the filename on disk:
import styles from './DriverAssigner.module.css';

export interface Driver {
  id: number;
  firstName: string;
  lastName: string;
}

export interface DriverAssignerProps {
  orderId:         string;
  currentDriverId: number | null;
  drivers:         Driver[];
  onAssign:        (driverId: number) => void;
  onUnassign:      () => void;
}

export default function DriverAssigner({
  currentDriverId,
  drivers,
  onAssign,
  onUnassign,
}: DriverAssignerProps) {
  return (
    <div className={styles.assigner}>
      {currentDriverId != null ? (
        <button onClick={onUnassign}>Un-assign</button>
      ) : (
        <select
          className={styles.select}
          defaultValue=""
          onChange={e => {
            const id = Number(e.target.value);
            if (!isNaN(id)) onAssign(id);
          }}
        >
          <option value="" disabled>
            Assign driver…
          </option>
          {drivers.map(d => (
            <option key={d.id} value={d.id}>
              {d.firstName} {d.lastName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
