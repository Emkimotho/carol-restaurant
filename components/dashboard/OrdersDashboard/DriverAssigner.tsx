/* =======================================================================
 * File: components/dashboard/OrdersDashboard/DriverAssigner.tsx
 * -----------------------------------------------------------------------
 * Tiny helper shown inside every card:
 *   • If a driver is already assigned  → “Un‑assign” button
 *   • Otherwise                       → <select> to pick a driver
 * ---------------------------------------------------------------------*/

'use client';

import React from 'react';
import styles from './orders.module.css';     // uses .actionBtn / .formControl etc.

/** A driver the kitchen team can assign */
export interface Driver {
  id: number;
  firstName: string;
  lastName: string;
}

export interface DriverAssignerProps {
  orderId:          string;
  currentDriverId:  number | null;
  drivers:          Driver[];               // list of online / available drivers
  onAssign:   (driverId: number) => void;   // parent handles API + mutate
  onUnassign: ()            => void;        // idem
}

export default function DriverAssigner({
  currentDriverId,
  drivers,
  onAssign,
  onUnassign,
}: DriverAssignerProps) {
  /* ——— already assigned → show Un‑assign ——— */
  if (currentDriverId != null) {
    return (
      <button className={styles.actionBtn} onClick={onUnassign}>
        Un‑assign
      </button>
    );
  }

  /* ——— no driver yet → picker ——— */
  return (
    <select
      className={styles.formControl}
      defaultValue=""
      onChange={(e) => {
        const id = Number(e.target.value);
        if (!isNaN(id)) onAssign(id);
      }}
    >
      <option value="" disabled>
        Assign driver…
      </option>
      {drivers.map((d) => (
        <option key={d.id} value={d.id}>
          {d.firstName} {d.lastName}
        </option>
      ))}
    </select>
  );
}
