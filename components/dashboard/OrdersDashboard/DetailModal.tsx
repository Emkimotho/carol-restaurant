// File: components/dashboard/OrdersDashboard/DetailModal.tsx
// ───────────────────────────────────────────────────────────────────────────
// Kitchen-dashboard “Order #XYZ” modal:  
// • Header with status, timing, mode/address  
// • Unified item-card list (qty, desc, spice, options, notes)  
// • Admin only: toggleable status history  
// ───────────────────────────────────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import Ordersmodal from './Ordersmodal';
import styles from './DetailModal.module.css';
import type { Order } from './types';

/** Turn ENUM_STYLE → "ENUM STYLE" */
const humanStatus = (s: string) => s.replace(/_/g, ' ');

type OptionGroup = {
  id: string;
  title?: string;
  name?: string;
  choices: Array<{
    id: string;
    label?: string;
    name?: string;
    title?: string;
    nestedOptionGroup?: {
      choices: Array<{ id: string; label?: string; name?: string; title?: string }>;
    };
  }>;
};

/** Renders a single group of selected options (and nested) */
function renderOptions(
  groups?: OptionGroup[],
  selected?: Record<string, any>
) {
  if (!groups || !selected) return null;

  return groups.map((g) => {
    const sel = selected[g.id];
    if (!sel?.selectedChoiceIds?.length) return null;

    const labels: string[] = [];
    g.choices.forEach((c) => {
      if (!sel.selectedChoiceIds.includes(c.id)) return;
      let lbl = (c.label ?? c.name ?? c.title ?? '').trim();
      const nestedIds: string[] = sel.nestedSelections?.[c.id] ?? [];
      if (nestedIds.length && c.nestedOptionGroup) {
        const nested = c.nestedOptionGroup.choices
          .filter((n) => nestedIds.includes(n.id))
          .map((n) => (n.label ?? n.name ?? n.title ?? '').trim());
        if (nested.length) lbl += ` (${nested.join(', ')})`;
      }
      labels.push(lbl);
    });

    if (!labels.length) return null;
    return (
      <li key={g.id} className={styles.optionItem}>
        <strong className={styles.optionGroupLabel}>
          {g.title ?? g.name}:
        </strong>{' '}
        {/* choices in bold green */}
        <strong
          className={styles.optionLabel}
          style={{ color: 'green', fontWeight: 'bold' }}
        >
          {labels.join(', ')}
        </strong>
      </li>
    );
  });
}

export interface DetailModalProps {
  isOpen: boolean;
  order: Order | null;
  role: 'admin' | 'staff' | 'server' | 'driver' | 'cashier'

  onClose: () => void;
}

export default function DetailModal({
  isOpen,
  order,
  role,
  onClose,
}: DetailModalProps) {
  const [showHistory, setShowHistory] = useState(false);
  if (!isOpen || !order) return null;

  return (
    <Ordersmodal
      isOpen={isOpen}
      title={`Order #${order.orderId}`}
      onClose={onClose}
    >
      {/* ───────── HEADER ───────── */}
      <div className={styles.meta}>
        <div>
          <strong>Status:</strong> {humanStatus(order.status)}
        </div>
        <div>
          <strong>Timing:</strong>{' '}
          {order.schedule
            ? `Scheduled – ${new Date(order.schedule).toLocaleString()}`
            : 'ASAP'}
        </div>
        <div>
          <strong>Delivery Mode:</strong> {humanStatus(order.deliveryType)}
        </div>
        {'holeNumber' in order && order.holeNumber != null && (
          <div>
            <strong>Hole #:</strong> {order.holeNumber}
          </div>
        )}
        {order.orderType === 'delivery' && order.deliveryAddress && (
          <div>
            <strong>Address:</strong>{' '}
            {order.deliveryAddress.street}, {order.deliveryAddress.city}{' '}
            {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
          </div>
        )}
      </div>

      <hr className={styles.separator} />

      {/* ───────── UNIFIED ITEM LIST ───────── */}
      <h3 className={styles.sectionTitle}>Items</h3>
      <ul className={styles.itemsList}>
        {order.items.map((item: any) => (
          <li key={item.id} className={styles.itemCard}>
            <div className={styles.itemHeader}>
              <span className={styles.itemTitle}>
                {item.title ?? item.name}
              </span>
              <span className={styles.itemQty}>× {item.quantity ?? 1}</span>
            </div>
            {item.description && (
              <div className={styles.itemDesc}>{item.description}</div>
            )}
            {item.spiceLevel && (
              <div className={styles.itemMeta}>
                <strong>Spice Level:</strong> {item.spiceLevel}
              </div>
            )}
            <ul className={styles.optionsList}>
              {renderOptions(item.optionGroups, item.selectedOptions) ?? (
                <li className={styles.optionItem}>
                  <em>No options selected</em>
                </li>
              )}
            </ul>
            {item.specialInstructions && (
              <div className={styles.itemMeta}>
                <strong>Note:</strong>{' '}
                {/* notes in secondary color, italic & bold */}
                <strong
                  style={{ color: '#6c757d', fontStyle: 'italic', fontWeight: 'bold' }}
                >
                  {item.specialInstructions}
                </strong>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* ───────── ADMIN HISTORY ───────── */}
      {role === 'admin' && order.statusHistory.length > 0 && (
        <>
          <hr className={styles.separator} />
          <button
            className={styles.historyToggle}
            onClick={() => setShowHistory((cur) => !cur)}
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
          {showHistory && (
            <ul className={styles.historyList}>
              {order.statusHistory.map((h: any, i: number) => {
                const who =
                  h.changedBy ??
                  (h.user
                    ? `${h.user.firstName} ${h.user.lastName}`
                    : 'System');
                return (
                  <li key={i}>
                    <strong>{humanStatus(h.status)}:</strong>{' '}
                    {new Date(h.timestamp).toLocaleString()} — <em>{who}</em>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Ordersmodal>
  );
}
