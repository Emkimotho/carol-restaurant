/* ======================================================================= */
/*  File: components/dashboard/OrdersDashboard/OrdersDashboard.tsx        */
/* ----------------------------------------------------------------------- */
/*  Shared Kitchen Orders dashboard (Admin & Staff).                       *
 *                                                                         *
 *  ✱ 2025‑05 updates                                                      *
 *    • deliveryType & paymentMethod now included in Order DTO.            *
 *      – Golf order = ON_COURSE (hole #)  or  EVENT (pavilion).           *
 *      – Cash badge when paymentMethod === "CASH".                        *
 *    • Detail modal shows:                                                *
 *        ▸ Deliver to Hole N  (on‑course)                                 *
 *        ▸ Deliver to Event Pavilion (event)                              *
 *        ▸ Pickup at Clubhouse (pickup)                                   *
 *        ▸ Standard address for regular delivery.                         *
 *    • Card + modal render item **title _and_ description**.              *
 *    • NEW action: Admin/Staff can *un‑assign* a driver from a job.       */
/* ======================================================================= */

'use client';

import React, { useEffect, useState } from 'react';
import useSWR                       from 'swr';
import { ToastContainer, toast }    from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import styles                       from './orders.module.css';
import { OrderStatus }              from '@prisma/client';
import type { DeliveryAddress }     from '@/contexts/OrderContext';

import Ordersmodal from './Ordersmodal';

/* ------------------------------------------------------------------ */
/*  Explicit sub‑types                                               */
/* ------------------------------------------------------------------ */
interface Driver { firstName: string; lastName: string }
interface Staff  { firstName: string; lastName: string }
interface HistoryEntry {
  status:    OrderStatus;
  timestamp: string;
  changedBy: string;
}

/* ------------------------------------------------------------------ */
/*  Props & DTOs                                                     */
/* ------------------------------------------------------------------ */
export interface OrdersDashboardProps {
  role:   'admin' | 'staff';
  userId?: string | number;
}

export interface Order {
  /* identifiers */
  id:        string;
  orderId:   string;

  /* timing & status */
  status:    OrderStatus;
  schedule:  string | null;
  createdAt: string;

  /* delivery / golf */
  deliveryType:     'PICKUP' | 'ON_COURSE' | 'EVENT';
  holeNumber?:      number | null;
  eventLocationId?: string | null;

  /* money & flags */
  totalAmount:     number;
  paymentMethod:   'CARD' | 'CASH';
  containsAlcohol: boolean;

  /* cart snapshot */
  items: Array<{
    id:           string;
    title?:       string;
    name?:        string;
    description?: string;
    quantity?:    number;
    specialInstructions?: string;
    optionGroups?: any[];
    selectedOptions?: Record<string, {
      selectedChoiceIds: string[];
      nestedSelections?: Record<string, string[]>;
    }>;
  }>;

  /* relations */
  guestName?:       string | null;
  customer?:        { firstName: string; lastName: string } | null;
  driver?:          Driver | null;
  staff?:           Staff  | null;
  statusHistory?:   HistoryEntry[];
  deliveryAddress?: DeliveryAddress | null;
}

interface OrdersListResponse {
  orders:     Order[];
  page:       number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/*  SWR + debounce                                                    */
/* ------------------------------------------------------------------ */
const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => r.json());

function useDebounce<T>(val: T, delay = 300) {
  const [deb, setDeb] = useState(val);
  useEffect(() => {
    const id = setTimeout(() => setDeb(val), delay);
    return () => clearTimeout(id);
  }, [val, delay]);
  return deb;
}

/* ------------------------------------------------------------------ */
/*  Labels & helpers                                                  */
/* ------------------------------------------------------------------ */
const LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT:     'Pending Payment',
  ORDER_RECEIVED:      'Received',
  IN_PROGRESS:         'In Progress',
  ORDER_READY:         'Ready',
  PICKED_UP_BY_DRIVER: 'Picked Up',
  ON_THE_WAY:          'On Route',
  DELIVERED:           'Delivered',
  CANCELLED:           'Cancelled',
};

const STEP_ORDER = [
  'ORDER_RECEIVED',
  'IN_PROGRESS',
  'ORDER_READY',
  'PICKED_UP_BY_DRIVER',
  'ON_THE_WAY',
  'DELIVERED',
  'CANCELLED',
] as const;

const NEXT: Partial<Record<OrderStatus, OrderStatus | null>> = {
  ORDER_RECEIVED: 'IN_PROGRESS',
  IN_PROGRESS:    'ORDER_READY',
  ORDER_READY:    null,
};

const canCancel = (s: OrderStatus) =>
  s === 'ORDER_RECEIVED' || s === 'IN_PROGRESS';

/* =================================================================== */
/*                             Component                               */
/* =================================================================== */
export default function OrdersDashboard({ role, userId }: OrdersDashboardProps) {
  /* ---------------- search & paging ---------------- */
  const [query, setQuery] = useState('');
  const debounced         = useDebounce(query, 300);
  const [page, setPage]   = useState(1);
  const limit             = 20;

  const key =
    `/api/orders?role=${role}` +
    (role === 'staff' && userId ? `&staffId=${userId}` : '') +
    `&page=${page}&limit=${limit}` +
    (debounced ? `&q=${encodeURIComponent(debounced)}` : '');

  /* ---------------- SWR fetch ---------------------- */
  const { data = { orders: [], page: 1, totalPages: 1 }, mutate } =
    useSWR<OrdersListResponse>(key, fetcher, { refreshInterval: 5000 });
  const { orders, totalPages } = data;

  /* ---------------- UI state ----------------------- */
  type Tab = 'pending' | 'active' | 'completed' | 'cancelled';
  const [tab, setTab] = useState<Tab>('active');
  const [detail, setDetail] = useState<Order | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingAlcoholPatch, setPendingAlcoholPatch] = useState<{
    order: Order;
    nextStatus: OrderStatus;
    msg: string;
  } | null>(null);

  /* ---------------- WebSocket patches -------------- */
  useEffect(() => {
    const ws = new WebSocket(
      `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws?room=ALL`
    );
    ws.onmessage = e => {
      try {
        const { id, value } = JSON.parse(e.data);
        mutate(prev =>
          prev
            ? {
                ...prev,
                orders: prev.orders.map(o =>
                  o.id === id ? { ...o, ...value } : o
                ),
              }
            : prev,
          false,
        );
      } catch {/* ignore */ }
    };
    return () => ws.close();
  }, [mutate]);

  /* ---------------- helpers ------------------------ */
  const patchOrder = async (o: Order, nextStatus: OrderStatus, msg: string) => {
    const t = toast.loading(msg);
    try {
      const res = await fetch(`/api/orders/${o.id}`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      toast.update(t, { render: 'Success', type: 'success', isLoading: false, autoClose: 1200 });
    } catch (err: any) {
      toast.update(t, { render: err.message, type: 'error', isLoading: false });
    }
  };

  const handlePatch = (o: Order, nextStatus: OrderStatus, msg: string) => {
    if (role === 'staff' && o.containsAlcohol) {
      setPendingAlcoholPatch({ order: o, nextStatus, msg });
    } else {
      patchOrder(o, nextStatus, msg);
    }
  };

  const deleteOrder = async (id: string) => {
    if (role !== 'admin' || !window.confirm('Delete permanently?')) return;
    const t = toast.loading('Deleting…');
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method:      'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      toast.update(t, { render: 'Deleted', type: 'success', isLoading: false, autoClose: 1200 });
    } catch (err: any) {
      toast.update(t, { render: err.message, type: 'error', isLoading: false });
    }
  };

  /* accompaniments string (used in modal) */
  const renderAcc = (it: any) => {
    if (!it.optionGroups || !it.selectedOptions) return null;
    const lines: string[] = [];
    it.optionGroups.forEach((g: any) => {
      const sel = it.selectedOptions[g.id];
      if (sel?.selectedChoiceIds?.length) {
        const ch = g.choices
          .filter((c: any) => sel.selectedChoiceIds.includes(c.id))
          .map((c: any) => {
            let nested = '';
            if (c.nestedOptionGroup && sel.nestedSelections?.[c.id]?.length) {
              nested =
                ' (' +
                c.nestedOptionGroup.choices
                  .filter((n: any) => sel.nestedSelections[c.id].includes(n.id))
                  .map((n: any) => n.label || n.id)
                  .join(', ') +
                ')';
            }
            return c.label + nested;
          });
        lines.push(`${g.title || g.id}: ${ch.join(', ')}`);
      }
    });
    return lines.length ? (
      <div className={styles.accompanimentsSection}>
        <h4>Accompaniments</h4>
        <p>{lines.join(' | ')}</p>
      </div>
    ) : null;
  };

  /* schedule badge */
  const ScheduleBadge = ({ order }: { order: Order }) => {
    if (!order.schedule) {
      return (
        <span className={`${styles.scheduleBadge} ${styles.scheduleASAP}`}>
          ASAP
        </span>
      );
    }
    const mins = Math.max(
      0,
      Math.floor((new Date(order.schedule).getTime() - Date.now()) / 60000)
    );
    return (
      <span className={`${styles.scheduleBadge} ${styles.scheduleScheduled}`}>
        {mins > 0 ? `Scheduled · T-${mins}m` : 'Scheduled'}
      </span>
    );
  };

  /* ---------------- derived lists ------------------ */
  const pending   = orders.filter(o => o.status === 'PENDING_PAYMENT');
  const active    = orders.filter(
    o => !['CANCELLED', 'DELIVERED', 'PENDING_PAYMENT'].includes(o.status)
  );
  const completed = orders.filter(o => o.status === 'DELIVERED');
  const cancelled = orders.filter(o => o.status === 'CANCELLED');
  const list =
    tab === 'pending'   ? pending   :
    tab === 'completed' ? completed :
    tab === 'cancelled' ? cancelled : active;

  /* =================================================================== */
  /*                               JSX                                   */
  /* =================================================================== */
  return (
    <>
      <ToastContainer position="top-right" />

      <div className={styles.container}>
        <h1 className={styles.header}>
          {role === 'admin' ? 'Kitchen / Admin' : 'Kitchen / Staff'}
        </h1>

        {/* search */}
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            placeholder="Search Order ID or Name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        {/* tabs */}
        <div className={styles.tabs}>
          <button className={tab === 'active'    ? styles.activeTab : ''} onClick={() => setTab('active')}>
            Active ({active.length})
          </button>
          {role === 'admin' && (
            <button className={tab === 'pending' ? styles.activeTab : ''} onClick={() => setTab('pending')}>
              Pending Payment ({pending.length})
            </button>
          )}
          <button className={tab === 'completed' ? styles.activeTab : ''} onClick={() => setTab('completed')}>
            Completed ({completed.length})
          </button>
          <button className={tab === 'cancelled' ? styles.activeTab : ''} onClick={() => setTab('cancelled')}>
            Cancelled ({cancelled.length})
          </button>
        </div>

        {/* grid */}
        <div className={styles.ordersGrid}>
          {list.map(o => (
            <div key={o.id} className={styles.card}>
              {/* ----- header ----- */}
              <div className={styles.cardHeader}>
                <span className={styles.orderId}>#{o.orderId}</span>
                <ScheduleBadge order={o} />

                {(o.holeNumber != null || o.deliveryType === 'EVENT') && (
                  <span className={styles.golfBadge}>⛳ Golf</span>
                )}

                {o.paymentMethod === 'CASH' && (
                  <span className={styles.cashBadge}>💵 Cash</span>
                )}

                {o.containsAlcohol && (
                  <span className={styles.alcoholBadge}>🍺 Alcohol</span>
                )}

                <span className={`${styles.badge} ${styles[o.status]}`}>
                  {LABEL[o.status]}
                </span>
              </div>

              {/* ----- stepper ----- */}
              {tab === 'active' && (
                <ul className={styles.stepper}>
                  {STEP_ORDER.map(s => (
                    <li
                      key={s}
                      className={
                        s === o.status
                          ? styles.isActive
                          : STEP_ORDER.indexOf(s) <
                            STEP_ORDER.indexOf(o.status as typeof STEP_ORDER[number])
                          ? styles.isDone
                          : ''
                      }
                    >
                      {LABEL[s]}
                    </li>
                  ))}
                </ul>
              )}

              {/* ----- body ----- */}
              <div className={styles.cardBody}>
                <p>
                  <strong>Main:</strong>{' '}
                  {o.items[0]?.title || o.items[0]?.name || '—'}
                </p>
                {o.items[0]?.description && (
                  <p className={styles.itemDesc}>{o.items[0].description}</p>
                )}

                {(o.guestName || o.customer) && (
                  <p className={styles.driverTag}>
                    <small>
                      {o.guestName ||
                        `${o.customer?.firstName} ${o.customer?.lastName}`}
                    </small>
                  </p>
                )}
                {o.driver && (
                  <p className={styles.driverTag}>
                    <small>
                      Driver: {o.driver.firstName} {o.driver.lastName}
                    </small>
                  </p>
                )}
                {o.staff && (
                  <p className={styles.driverTag}>
                    <small>
                      Staff: {o.staff.firstName} {o.staff.lastName}
                    </small>
                  </p>
                )}
              </div>

              {/* ----- footer ----- */}
              <div className={styles.cardFooter}>
                {tab === 'active' && NEXT[o.status] && (
                  <button
                    className={styles.actionBtn}
                    onClick={() =>
                      handlePatch(
                        o,
                        NEXT[o.status]!,
                        o.status === 'ORDER_RECEIVED'
                          ? 'Starting prep…'
                          : 'Marking ready…'
                      )
                    }
                  >
                    {o.status === 'ORDER_RECEIVED' ? 'Start Prep' : 'Mark Ready'}
                  </button>
                )}

                {tab === 'active' && canCancel(o.status) && (
                  <button
                    className={styles.actionBtn}
                    onClick={() => handlePatch(o, 'CANCELLED', 'Cancelling…')}
                  >
                    Cancel
                  </button>
                )}

                {/* --- new UN‑ASSIGN action for admin/staff --- */}
                {o.driver && (role === 'admin' || role === 'staff') && (
                  <button
                    className={styles.actionBtn}
                    onClick={async () => {
                      if (!confirm(`Remove ${o.driver!.firstName} from this order?`)) return;
                      await fetch(`/api/orders/${o.id}/driver`, {
                        method:  'PATCH',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          driverId:   null,
                          nextStatus: 'ORDER_READY',   // rollback to ready
                        }),
                      });
                    }}
                  >
                    Un‑assign
                  </button>
                )}

                <button
                  className={styles.actionBtn}
                  onClick={() => {
                    setDetail(o);
                    setShowHistory(false);
                  }}
                >
                  Details
                </button>

                {role === 'admin' && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => deleteOrder(o.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* pagination */}
        <div className={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            Next
          </button>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* age‑check modal */}
      <Ordersmodal
        isOpen={!!pendingAlcoholPatch}
        title="Age Verification"
        onClose={() => setPendingAlcoholPatch(null)}
      >
        <p>⚠️ This order contains alcohol. Confirm you’re at least 21 years old to proceed.</p>
        <div className={styles.modalFooter}>
          <button
            className={styles.actionBtn}
            onClick={() => {
              if (pendingAlcoholPatch) {
                const { order, nextStatus, msg } = pendingAlcoholPatch;
                patchOrder(order, nextStatus, msg);
              }
              setPendingAlcoholPatch(null);
            }}
          >
            I’m 21+
          </button>
          <button className={styles.deleteBtn} onClick={() => setPendingAlcoholPatch(null)}>
            Cancel
          </button>
        </div>
      </Ordersmodal>

      {/* detail modal */}
      <Ordersmodal
        isOpen={!!detail}
        title={detail ? `Order #${detail.orderId}` : undefined}
        onClose={() => { setDetail(null); setShowHistory(false); }}
      >
        {detail && (
          <>
            <p><strong>Status:</strong> {LABEL[detail.status]}</p>
            <p>
              <strong>Timing:</strong>{' '}
              {detail.schedule
                ? `Scheduled – ${new Date(detail.schedule).toLocaleString()}`
                : 'ASAP'}
            </p>

            {/* golf / destination */}
            {detail.deliveryType === 'ON_COURSE' && detail.holeNumber != null && (
              <p><strong>Deliver to:</strong> Hole {detail.holeNumber}</p>
            )}
            {detail.deliveryType === 'EVENT' && (
              <p><strong>Deliver to:</strong> Event Pavilion</p>
            )}
            {detail.deliveryType === 'PICKUP' && (
              <p><strong>Pickup at:</strong> Clubhouse</p>
            )}
            {detail.deliveryType !== 'ON_COURSE' &&
              detail.deliveryType !== 'EVENT' &&
              detail.deliveryAddress && (
                <>
                  <p>
                    <strong>Delivery Address:</strong>{' '}
                    {detail.deliveryAddress.street}, {detail.deliveryAddress.city}
                  </p>
                  <p>
                    {detail.deliveryAddress.state}{' '}
                    {detail.deliveryAddress.zipCode}
                  </p>
                </>
              )}

            {role === 'admin' && detail.driver && (
              <p><strong>Driver:</strong> {detail.driver.firstName} {detail.driver.lastName}</p>
            )}
            {role === 'admin' && detail.staff && (
              <p><strong>Staff:</strong> {detail.staff.firstName} {detail.staff.lastName}</p>
            )}

            <hr />
            <h3>Items</h3>
            {detail.items.map((it, idx) => (
              <div key={idx} className={styles.mainItemDetail}>
                <p>
                  <strong>{it.title || it.name}</strong> × {it.quantity || 1}
                </p>
                {it.description && (
                  <p className={styles.itemDesc}>{it.description}</p>
                )}
                {renderAcc(it)}
                {it.specialInstructions && (
                  <p className={styles.note}>
                    <em>Note:</em> {it.specialInstructions}
                  </p>
                )}
              </div>
            ))}

            {role === 'admin' && detail.statusHistory?.length ? (
              <>
                <hr />
                <button
                  className={styles.historyToggleBtn}
                  onClick={() => setShowHistory(h => !h)}
                >
                  {showHistory ? 'Hide History' : 'Show History'}
                </button>
                {showHistory && (
                  <ul className={styles.historyList}>
                    {detail.statusHistory.map((h, i) => (
                      <li key={i}>
                        <strong>{LABEL[h.status]}:</strong>{' '}
                        {new Date(h.timestamp).toLocaleString()} — <em>{h.changedBy}</em>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : null}
          </>
        )}
      </Ordersmodal>
    </>
  );
}
