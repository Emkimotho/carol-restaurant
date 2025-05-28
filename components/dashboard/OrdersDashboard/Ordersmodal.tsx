'use client';

import React from 'react';
import ReactDOM from 'react-dom';
import styles from './Ordersmodal.module.css';

interface OrdersmodalProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Ordersmodal({
  isOpen,
  title,
  onClose,
  children,
}: OrdersmodalProps) {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </header>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
