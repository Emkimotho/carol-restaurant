// File: components/dashboard/OrdersDashboard/PaginationControls.tsx

import React from 'react';
import styles from './PaginationControls.module.css';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export default function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </button>
      <span className={styles.info}>
        Page {page} of {totalPages}
      </span>
      <button
        className={styles.button}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
