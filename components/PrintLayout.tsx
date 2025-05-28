// File: components/PrintLayout.tsx
"use client";

import React, { ReactNode } from "react";
import styles from "./PrintLayout.module.css";

interface PrintLayoutProps {
  rangeLabel?: string;
  children: ReactNode;
}

export default function PrintLayout({
  rangeLabel,
  children,
}: PrintLayoutProps) {
  return (
    <>
      <style jsx global>{`
        @page {
          size: landscape;
          margin: 0.5in;
        }
        @media print {
          /* hide elements marked no-print */
          .no-print { display: none !important; }
          /* make all tables span full width with fixed column layout */
          table {
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 10pt !important;
          }
          table th,
          table td {
            padding: 0.2em !important;
            overflow-wrap: break-word !important;
          }
        }
      `}</style>

      {rangeLabel && (
        <div className={styles.printHeader}>
          <h1>
            19<sup>th</sup> Hole Restaurant &amp; Bar
          </h1>
          <address>
            20025 Mount Aetna Road<br />
            Hagerstown, MD 21742<br />
            Phone: (240) 313-2819
          </address>
          <div className={styles.rangeLine}>
            Statement Range: <strong>{rangeLabel}</strong>
          </div>
          <hr />
        </div>
      )}

      <div className={styles.printContainer}>{children}</div>
    </>
  );
}
