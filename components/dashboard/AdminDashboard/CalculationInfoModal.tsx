// File: components/dashboard/AdminDashboard/CalculationInfoModal.tsx
'use client';

import React, { useState } from 'react';
import styles from './CalculationInfoModal.module.css';

export default function CalculationInfoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <>
      {/* Trigger button/icon */}
      <button
        type="button"
        className={styles.infoButton}
        onClick={open}
        aria-label="Show calculation info"
      >
        ℹ️
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={close}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calc-info-title"
          >
            <header className={styles.header}>
              <h2 id="calc-info-title">How Finance Calculations Work</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={close}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <div className={styles.content}>
              <p>We compute each order’s key figures as follows:</p>
              <ul>
                <li>
                  <strong>Subtotal</strong> = total cost of menu items (including all option groups and nested choices). This is the restaurant’s sale revenue from the order.
                </li>
                <li>
                  <strong>Taxes</strong> are displayed separately but not included in payouts or net calculations, since they go to tax authorities.
                </li>
                <li>
                  <strong>Tip Amount</strong> = goes fully to the driver (for delivery orders) or server (for non-delivery/pickup orders). Not counted as restaurant revenue.
                </li>
                <li>
                  <strong>Customer Delivery Fee</strong> = paid by customer for delivery; for delivery orders this goes fully to driver, not counted as restaurant revenue.
                </li>
                <li>
                  <strong>Restaurant Delivery Subsidy</strong> = extra amount the restaurant pays so the driver receives full delivery compensation. This is the only delivery-related expense to the restaurant in this report.
                </li>
                <li>
                  <strong>Driver Payout</strong> = for delivery orders: Tip Amount + Customer Delivery Fee + Restaurant Delivery Subsidy. For non-delivery orders: 0.
                </li>
                <li>
                  <strong>Server Payout</strong> = for non-delivery orders (e.g., pickup, on-course): Tip Amount. For delivery orders: 0.
                </li>
                <li>
                  <strong>Totals</strong>: in the KPI cards we show the sum across all delivered orders in the period for each field (subtotal, taxes, tips, fees, subsidies, driver payout, server payout).
                </li>
              </ul>

              <p>Example for one non-delivery (pickup/server) order:</p>
              <table className={styles.exampleTable}>
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Subtotal</td>
                    <td>$31.25</td>
                  </tr>
                  <tr>
                    <td>Taxes</td>
                    <td>$1.88</td>
                  </tr>
                  <tr>
                    <td>Tip Amount</td>
                    <td>$6.25</td>
                  </tr>
                  <tr>
                    <td>Customer Delivery Fee</td>
                    <td>$0.00</td>
                  </tr>
                  <tr>
                    <td>Restaurant Delivery Subsidy</td>
                    <td>$0.00</td>
                  </tr>
                  <tr>
                    <td>Driver Payout</td>
                    <td>$0.00</td>
                  </tr>
                  <tr>
                    <td>Server Payout</td>
                    <td>$6.25</td>
                  </tr>
                </tbody>
              </table>

              <p>
                In short: tips go to server for non-delivery; for delivery orders tips + fees + subsidy go to driver. Restaurant revenue is only from Subtotal; delivery subsidy is expense deducted from revenue if you show net—but here we only display the subsidy separately.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
