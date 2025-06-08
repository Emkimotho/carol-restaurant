// File: components/dashboard/OrdersDashboard/OrdersDashboard.tsx
// ───────────────────────────────────────────────────────────────────────
// Shared Orders Dashboard for Admin, Staff, Server, and Cashier
// ───────────────────────────────────────────────────────────────────────

'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import styles from './orders.module.css';
import type { DeliveryAddress } from '@/contexts/OrderContext';

import OrdersTabs, { TabKey, Tab } from './OrdersTabs';
import OrdersGrid from './OrdersGrid';
import DetailModal from './DetailModal';
import AgeCheckModal from './AgeCheckModal';
import type { Driver } from './DriverAssigner';

export interface OrdersDashboardProps {
  role:    'admin' | 'staff' | 'server' | 'cashier';
  userId?: string | number;
}

/* ------------------------------------------------------------------ */
/*  Order shape sent down by our GET /api/orders controller            */
/* ------------------------------------------------------------------ */
export interface Order {
  id:               string;
  orderId:          string;
  status:           string;
  schedule:         string | null;
  createdAt:        string;
  orderType?:       string | null;
  deliveryType:     string;
  holeNumber?:      number | null;
  totalAmount:      number;
  tipAmount?:       number;
  tipRecipientId?:  number;
  paymentMethod:    'CARD' | 'CASH';
  containsAlcohol:  boolean;
  cashCollection?: {
    status: 'PENDING' | 'SETTLED';
    amount?: number;
    server?: { firstName: string; lastName: string } | null;
  };

  items:            Array<Record<string, any>>;
  lineItems:        Array<Record<string, any>>;
  statusHistory:    Array<Record<string, any>>;

  guestName?:       string | null;
  customer?:        { firstName: string; lastName: string } | null;
  driver?:          { id: number; firstName: string; lastName: string; isOnline: boolean } | null;
  staff?:           { firstName: string; lastName: string } | null;
  deliveryAddress?: DeliveryAddress | null;

  driverPayout?:    number;
  deliveryInstructions?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Cash-collection aggregate used for the server filter (cashier)     */
/* ------------------------------------------------------------------ */
interface ServerAgg {
  server: { id: number; firstName: string; lastName: string };
  pendingOrders: number;
  totalAmount:   number;
}

interface CashCollectionRecord {
  id:          string;
  orderId:     string;
  amount:      number;
  collectedAt: string | null;
}

interface OrdersListResponse {
  orders:     Order[];
  page:       number;
  totalPages: number;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => r.json());

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function OrdersDashboard({
  role,
  userId,
}: OrdersDashboardProps) {
  // Search & pagination
  const [query, setQuery]       = useState('');
  const debouncedQuery          = useDebounce(query, 300);
  const [page, setPage]         = useState(1);
  const limit                   = 20;

  /* ---------------- Cashier server filter ---------------- */
  const [serverFilter, setServerFilter] = useState<string>(''); // '' = all servers
  const { data: serverAgg = [] } =
    useSWR<ServerAgg[]>(
      role === 'cashier' ? '/api/orders/cash-collections?groupBy=server' : null,
      fetcher,
      { refreshInterval: 10000 }
    );

  // Modals state
  const [detail, setDetail] = useState<Order | null>(null);
  const [agePatch, setAgePatch] = useState<{ order: Order; nextStatus: string; msg: string } | null>(null);

  // Build SWR key
  let ordersKey = `/api/orders?page=${page}&limit=${limit}`;

  // Only admins & staff search by q=…
  if ((role === 'admin' || role === 'staff') && debouncedQuery) {
    ordersKey += `&q=${encodeURIComponent(debouncedQuery)}`;
  }

  // Staff sees only their own (staffId)
  if (role === 'staff' && userId) {
    ordersKey += `&staffId=${userId}`;
  }

  // Servers: do NOT append any `role=` filter. The backend will simply return all orders,
  // and the front end will split them into “Ready / En Route / Delivered / Pending Cash.”
  // (In particular, we DO NOT pass &role=server or &role=driver here.)
  // Cashiers:
  if (role === 'cashier') {
    ordersKey += `&reconciled=false`;
    if (serverFilter) ordersKey += `&serverId=${serverFilter}`;
  }

  const { data = { orders: [], page: 1, totalPages: 1 }, mutate } =
    useSWR<OrdersListResponse>(ordersKey, fetcher, { refreshInterval: 5000 });
  const { orders, totalPages } = data;

  // Poll online drivers for admin/staff
  const { data: drivers = [] } =
    useSWR<Driver[]>(
      (role === 'admin' || role === 'staff') ? '/api/drivers?status=online' : null,
      fetcher,
      { refreshInterval: 30000 }
    );

  // Precompute filtered sets
  const received    = orders.filter(o => o.status === 'ORDER_RECEIVED');
  const inPrep      = orders.filter(o => o.status === 'IN_PROGRESS');
  const ready       = orders.filter(o => o.status === 'ORDER_READY');
  const enRoute     = orders.filter(o => o.status === 'PICKED_UP_BY_DRIVER');
  const delivered   = orders.filter(o => o.status === 'DELIVERED');
  const pending     = orders.filter(o => o.status === 'PENDING_PAYMENT');
  const active      = orders.filter(o =>
    !['PENDING_PAYMENT', 'ORDER_READY', 'DELIVERED', 'CANCELLED'].includes(o.status)
  );
  const completed   = delivered;
  const cancelled   = orders.filter(o => o.status === 'CANCELLED');
  const toReconcile = orders.filter(o => o.cashCollection?.status === 'PENDING');
  const reconciled  = orders.filter(o => o.cashCollection?.status === 'SETTLED');

  // Server: fetch pending cash‐collection records
  const { data: pendingCashData = [] } = useSWR<CashCollectionRecord[]>(
    role === 'server' && userId
      ? `/api/orders/cash-collections?serverId=${userId}&status=PENDING`
      : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Remap pendingCashData for rendering
  const pendingCash = pendingCashData.map(c => ({
    cashId:      c.id,
    orderId:     c.orderId,
    amount:      c.amount,
    collectedAt: c.collectedAt,
  }));

  // Tabs & defaults by role (including “Pending Cash” for Server)
  let tabs: Tab[]           = [];
  let defaultTab: TabKey    = 'active';

  switch (role) {
    case 'staff':
      tabs = [
        { key: 'received',  label: 'Received',      count: received.length  },
        { key: 'inPrep',    label: 'In Prep',       count: inPrep.length    },
        { key: 'ready',     label: 'Ready',         count: ready.length     },
        { key: 'completed', label: 'Completed',     count: completed.length },
      ];
      defaultTab = 'received';
      break;

    case 'server':
      tabs = [
        { key: 'ready',       label: 'Ready to Serve',  count: ready.length       },
        { key: 'enRoute',     label: 'En Route to Tee', count: enRoute.length     },
        { key: 'delivered',   label: 'Delivered',       count: delivered.length   },
        { key: 'pendingCash', label: 'Pending Cash',    count: pendingCash.length },
      ];
      defaultTab = 'ready';
      break;

    case 'cashier':
      tabs = [
        { key: 'toReconcile', label: 'To Reconcile', count: toReconcile.length },
        { key: 'reconciled',  label: 'Reconciled',   count: reconciled.length  },
      ];
      defaultTab = 'toReconcile';
      break;

    case 'admin':
    default:
      tabs = [
        { key: 'active',    label: 'Active',          count: active.length    },
        { key: 'pending',   label: 'Pending Payment', count: pending.length   },
        { key: 'ready',     label: 'Ready',           count: ready.length     },
        { key: 'completed', label: 'Completed',       count: completed.length },
        { key: 'cancelled', label: 'Cancelled',       count: cancelled.length },
      ];
      defaultTab = 'active';
  }

  const [tab, setTab] = useState<TabKey>(defaultTab);

  // Select list for current tab
  let listToShow: Order[] = [];
  switch (tab) {
    case 'received':     listToShow = received;     break;
    case 'inPrep':       listToShow = inPrep;       break;
    case 'ready':        listToShow = ready;        break;
    case 'enRoute':      listToShow = enRoute;      break;
    case 'delivered':    listToShow = delivered;    break;
    case 'pendingCash':  listToShow = [];           break; // rendered separately
    case 'toReconcile':  listToShow = toReconcile;  break;
    case 'reconciled':   listToShow = reconciled;   break;
    case 'active':       listToShow = active;       break;
    case 'pending':      listToShow = pending;      break;
    case 'completed':    listToShow = completed;    break;
    case 'cancelled':    listToShow = cancelled;    break;
  }

  // Cashier reconciliation
  const [cashInput, setCashInput] = useState('');
  const handleReconcile = async () => {
    const ids = listToShow.map(o => o.id);
    const t   = toast.loading('Reconciling cash…');
    try {
      const res = await fetch('/api/orders/reconcile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids, cashReceived: Number(cashInput) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      toast.update(t, { render: 'Reconciled', type: 'success', isLoading: false, autoClose: 1200 });
      setCashInput('');
    } catch (e: any) {
      toast.update(t, { render: e.message, type: 'error', isLoading: false });
    }
  };

  // Staff tip total: only from golf orders, where driverPayout ≠ 0 and deliveryInstructions is not null
  const tipTotal = orders
    .filter(o =>
      o.tipRecipientId === Number(userId) &&
      o.deliveryType !== 'DELIVERY' &&
      (o.driverPayout ?? 0) !== 0 &&
      o.deliveryInstructions != null
    )
    .reduce((sum, o) => sum + (o.tipAmount ?? 0), 0);

  return (
    <>
      <ToastContainer position="top-right" />

      <div className={styles.container}>
        <h1 className={styles.header}>
          {role === 'admin'   && 'Kitchen / Admin'}
          {role === 'staff'   && 'Kitchen / Staff'}
          {role === 'server'  && 'Server Dashboard'}
          {role === 'cashier' && 'Cashier Panel'}
        </h1>

        {role === 'staff' && (
          <div className={styles.tipsWidget}>
            <strong>Your Tips:</strong> ${tipTotal.toFixed(2)}
          </div>
        )}

        {(role === 'admin' || role === 'staff') && (
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              placeholder="Search Order ID or Name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        )}

        {/* ---------- Cashier server filter ---------- */}
        {role === 'cashier' && (
          <div className={styles.searchRow}>
            <label style={{ marginRight: 8 }}>
              Server&nbsp;
              <select
                value={serverFilter}
                onChange={(e) => { setServerFilter(e.target.value); setPage(1); }}
                className={styles.searchInput}
              >
                <option value="">All servers</option>
                {serverAgg.map((s) => (
                  <option key={s.server.id} value={s.server.id}>
                    {s.server.firstName} {s.server.lastName} &nbsp;({s.pendingOrders})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <OrdersTabs tabs={tabs} current={tab} onChange={setTab} />

        {/* ---------- Pending Cash Tab for Server ---------- */}
        {role === 'server' && tab === 'pendingCash' && (
          <div className={styles.cashTab}>
            <h2>Your Pending Cash Orders</h2>
            <table className={styles.cashTable}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Amount ($)</th>
                  <th>Collected At</th>
                </tr>
              </thead>
              <tbody>
                {pendingCash.map((c) => (
                  <tr key={c.cashId}>
                    <td>{c.orderId}</td>
                    <td>{c.amount.toFixed(2)}</td>
                    <td>
                      {c.collectedAt
                        ? new Date(c.collectedAt).toLocaleString()
                        : '—'}
                    </td>
                  </tr>
                ))}
                {pendingCash.length === 0 && (
                  <tr>
                    <td colSpan={3}>No pending cash orders to reconcile.</td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className={styles.cashTotal}>
              <strong>Total Pending:</strong> $
              {pendingCash.reduce((sum, c) => sum + c.amount, 0).toFixed(2)}
            </p>
          </div>
        )}

        {/* ---------- Cashier reconciliation section ---------- */}
        {role === 'cashier' && tab === 'toReconcile' && (
          <div className={styles.reconcileSection}>
            <h2>Cash Reconciliation</h2>
            <p>Pending orders: {listToShow.length}</p>
            <p>
              Total cash amount: $
              {listToShow.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}
            </p>
            <label>
              Enter cash received:
              <input
                type="number"
                value={cashInput}
                onChange={e => setCashInput(e.target.value)}
                className={styles.reconcileInput}
              />
            </label>
            <button
              onClick={handleReconcile}
              disabled={!cashInput}
              className={styles.reconcileBtn}
            >
              Reconcile
            </button>
          </div>
        )}

        {/* ---------- Orders Grid for all other tabs ---------- */}
        {!(
          (role === 'server' && tab === 'pendingCash') ||
          (role === 'cashier' && tab === 'toReconcile')
        ) && (
          <OrdersGrid
            list={listToShow}
            role={role}
            drivers={drivers}
            // Pass serverId so that OrdersGrid can include it if needed for "claim" / "pick up"
            serverId={role === 'server' ? Number(userId) : undefined}
            mutate={mutate}
            onShowDetail={o => setDetail(o)}
            onShowAgePatch={patch => setAgePatch(patch)}
          />
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        )}
      </div>

      <AgeCheckModal
        isOpen={!!agePatch}
        patch={agePatch!}
        onClose={() => setAgePatch(null)}
        onDone={() => { mutate(); setAgePatch(null); }}
      />

      <DetailModal
        isOpen={!!detail}
        order={detail as any}
        role={role}
        onClose={() => setDetail(null)}
      />
    </>
  );
}
