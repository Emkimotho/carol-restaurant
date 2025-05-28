// File: components/dashboard/OrdersDashboard/DetailModal.tsx
// — Kitchen-dashboard “Order #XYZ” modal (full detail + history)

'use client';

import React, { useState } from 'react';
import Ordersmodal from './Ordersmodal';
import styles from './orders.module.css';
import { Order as BaseOrder } from './OrdersDashboard';

/* ------------------------------------------------------------------ */
/*                              Types                                 */
/* ------------------------------------------------------------------ */

// Choice within an OptionGroup (falling back on label/name/title)
type Choice = {
  id: string;
  label?: string;
  name?: string;
  title?: string;
  nestedOptionGroup?: {
    choices: Choice[];
  };
};

// OptionGroup definition
type OptionGroup = {
  id: string;
  title?: string;
  name?: string;
  choices: Choice[];
};

/** 
 * Our modal’s order type: 
 *   – Everything in BaseOrder 
 *   – except we Omit the original `items` 
 *   – then add our raw `items`, plus holeNumber & deliveryType 
 */
type OrderWithRaw = Omit<BaseOrder, 'items'> & {
  holeNumber?: number | null;
  deliveryType: string;
  /** raw payload items straight from the DB */
  items: Array<{
    id: string;
    title?: string;
    name?: string;
    description?: string;
    quantity?: number;
    specialInstructions?: string;
    optionGroups?: OptionGroup[];
    selectedOptions?: Record<
      string,
      {
        selectedChoiceIds: string[];
        nestedSelections?: Record<string, string[]>;
      }
    >;
  }>;
};

export interface DetailModalProps {
  isOpen: boolean;
  order: OrderWithRaw | null;
  role: 'admin' | 'staff' | 'server' | 'cashier';
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*                         Helper utilities                           */
/* ------------------------------------------------------------------ */
const humanStatus = (s: string) => s.replace(/_/g, ' ');

function choiceLabel(c: Choice) {
  return (c.label ?? c.name ?? c.title ?? '').trim();
}

function groupLabel(g: OptionGroup) {
  return (g.title ?? g.name ?? '').trim();
}

/** Render one item’s selected options (with nested) */
function renderRawOptions(
  optionGroups: OptionGroup[] | undefined,
  selectedOptions:
    | OrderWithRaw['items'][number]['selectedOptions']
    | undefined
) {
  if (!optionGroups || !selectedOptions) return null;

  return optionGroups.map((g) => {
    const sel = selectedOptions[g.id];
    if (!sel) return null;

    const labels: string[] = [];
    g.choices.forEach((c) => {
      if (!sel.selectedChoiceIds.includes(c.id)) return;
      let lbl = choiceLabel(c);
      const nestedIds = sel.nestedSelections?.[c.id] ?? [];
      if (nestedIds.length && c.nestedOptionGroup) {
        const nested = c.nestedOptionGroup.choices
          .filter((n) => nestedIds.includes(n.id))
          .map(choiceLabel);
        if (nested.length) lbl += ` (${nested.join(', ')})`;
      }
      labels.push(lbl);
    });

    if (!labels.length) return null;
    return (
      <li key={g.id} className={styles.note}>
        <em style={{ color: 'green', fontStyle: 'italic', fontWeight: 600 }}>
          {groupLabel(g)}:
        </em>{' '}
        <span style={{ color: 'green' }}>{labels.join(', ')}</span>
      </li>
    );
  });
}

/* ------------------------------------------------------------------ */
/*                              Modal                                 */
/* ------------------------------------------------------------------ */
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
      {/* ─────────  Meta  ───────── */}
      <p>
        <strong>Status:</strong> {humanStatus(order.status)}
      </p>
      <p>
        <strong>Timing:</strong>{' '}
        {order.schedule
          ? `Scheduled – ${new Date(order.schedule).toLocaleString()}`
          : 'ASAP'}
      </p>
      <p>
        <strong>Delivery Mode:</strong> {humanStatus(order.deliveryType)}
      </p>
      {order.holeNumber != null && (
        <p>
          <strong>Hole #:</strong> {order.holeNumber}
        </p>
      )}

      {/* address (main-menu) */}
      {order.orderType === 'delivery' && order.deliveryAddress && (
        <>
          <p>
            <strong>Address:</strong>{' '}
            {order.deliveryAddress.street}, {order.deliveryAddress.city}
          </p>
          <p>
            {order.deliveryAddress.state}{' '}
            {order.deliveryAddress.zipCode}
          </p>
        </>
      )}

      {/* driver / staff */}
      {role === 'admin' && order.driver && (
        <p>
          <strong>Driver:</strong> {order.driver.firstName}{' '}
          {order.driver.lastName}
        </p>
      )}
      {role === 'admin' && order.staff && (
        <p>
          <strong>Staff:</strong> {order.staff.firstName}{' '}
          {order.staff.lastName}
        </p>
      )}

      {/* ─────────  Normalised lineItems  ───────── */}
      <hr />
      <h3>Line Items</h3>
      {order.lineItems.map((li) => (
        <div key={li.id} className={styles.mainItemDetail}>
          <p>
            <strong>{li.menuItem.title}</strong> × {li.quantity}
          </p>
          {li.menuItem.description && (
            <p className={styles.itemDesc}>
              {li.menuItem.description}
            </p>
          )}
          {li.spiceLevel && (
            <p className={styles.note}>
              <em>Spice Level:</em> {li.spiceLevel}
            </p>
          )}
          {li.specialNotes && (
            <p className={styles.note}>
              <em>Note:</em> {li.specialNotes}
            </p>
          )}
        </div>
      ))}

      {/* ─────────  Raw items for options / notes  ───────── */}
      <hr />
      <h3>Customisations & Notes</h3>
      {order.items.map((item) => (
        <div key={item.id} className={styles.mainItemDetail}>
          {/* 1) Title × Qty */}
          <p>
            <strong>{item.title ?? item.name}</strong> × {item.quantity ?? 1}
          </p>

          {/* 2) Description */}
          {item.description && (
            <p className={styles.itemDesc}>{item.description}</p>
          )}

          {/* 3) Options right below, in green */}
          <ul>
            {renderRawOptions(item.optionGroups, item.selectedOptions) ?? (
              <li className={styles.note}>
                <em>No options selected</em>
              </li>
            )}
          </ul>

          {/* 4) “Note:” last */}
          {item.specialInstructions && (
            <p className={styles.note}>
              <em>Note:</em> {item.specialInstructions}
            </p>
          )}
        </div>
      ))}

      {/* ─────────  History (admin only)  ───────── */}
      {role === 'admin' && order.statusHistory.length > 0 && (
        <>
          <hr />
          <button
            className={styles.historyToggleBtn}
            onClick={() => setShowHistory((s) => !s)}
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </button>
          {showHistory && (
            <ul className={styles.historyList}>
              {order.statusHistory.map((h, i) => {
                const who =
                  h.changedBy ??
                  (h.user
                    ? `${h.user.firstName} ${h.user.lastName}`
                    : 'System');
                return (
                  <li key={i}>
                    <strong>{humanStatus(h.status)}:</strong>{' '}
                    {new Date(h.timestamp).toLocaleString()} —{' '}
                    <em>{who}</em>
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
