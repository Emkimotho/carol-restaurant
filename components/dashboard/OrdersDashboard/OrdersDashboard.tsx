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
  cashCollection?:  { status: 'PENDING' | 'SETTLED' };

  items:            Array<Record<string, any>>;
  lineItems:        Array<Record<string, any>>;
  statusHistory:    Array<Record<string, any>>;

  guestName?:       string | null;
  customer?:        { firstName: string; lastName: string } | null;
  driver?:          { id: number; firstName: string; lastName: string; isOnline: boolean } | null;
  staff?:           { firstName: string; lastName: string } | null;
  deliveryAddress?: DeliveryAddress | null;
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

  // Modals state
  const [detail, setDetail] = useState<Order | null>(null);
  const [agePatch, setAgePatch] = useState<{ order: Order; nextStatus: string; msg: string } | null>(null);

  // Build SWR key
  let ordersKey = `/api/orders?role=${role}&page=${page}&limit=${limit}`;
  if ((role === 'admin' || role === 'staff') && debouncedQuery) {
    ordersKey += `&q=${encodeURIComponent(debouncedQuery)}`;
  }
  if (role === 'staff' && userId) {
    ordersKey += `&staffId=${userId}`;
  }
  if (role === 'server') {
    ordersKey += `&status=ORDER_READY`;
  }
  if (role === 'cashier') {
    ordersKey += `&reconciled=false`;
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
    !['PENDING_PAYMENT','DELIVERED','CANCELLED'].includes(o.status)
  );
  const completed   = delivered;
  const cancelled   = orders.filter(o => o.status === 'CANCELLED');
  const toReconcile = orders.filter(o => o.cashCollection?.status === 'PENDING');
  const reconciled  = orders.filter(o => o.cashCollection?.status === 'SETTLED');

  // Tabs & defaults by role
  let tabs: Tab[]           = [];
  let defaultTab: TabKey    = 'active';

  switch (role) {
    case 'staff':
      tabs = [
        { key: 'received',    label: 'Received',         count: received.length },
        { key: 'inPrep',      label: 'In Prep',          count: inPrep.length    },
        { key: 'ready',       label: 'Ready',            count: ready.length     },
      ];
      defaultTab = 'received';
      break;
    case 'server':
      tabs = [
        { key: 'ready',       label: 'Ready to Serve',   count: ready.length   },
        { key: 'enRoute',     label: 'En Route',         count: enRoute.length },
        { key: 'delivered',   label: 'Delivered',        count: delivered.length },
      ];
      defaultTab = 'ready';
      break;
    case 'cashier':
      tabs = [
        { key: 'toReconcile', label: 'To Reconcile',     count: toReconcile.length },
        { key: 'reconciled',  label: 'Reconciled',       count: reconciled.length  },
      ];
      defaultTab = 'toReconcile';
      break;
    case 'admin':
    default:
      tabs = [
        { key: 'active',      label: 'Active',           count: active.length    },
        { key: 'pending',     label: 'Pending Payment',  count: pending.length   },
        { key: 'completed',   label: 'Completed',        count: completed.length },
        { key: 'cancelled',   label: 'Cancelled',        count: cancelled.length },
      ];
      defaultTab = 'active';
  }

  const [tab, setTab] = useState<TabKey>(defaultTab);

  // Select list for current tab
  let listToShow: Order[] = orders;
  switch (tab) {
    case 'received':     listToShow = received;     break;
    case 'inPrep':       listToShow = inPrep;       break;
    case 'ready':        listToShow = ready;        break;
    case 'enRoute':      listToShow = enRoute;      break;
    case 'delivered':    listToShow = delivered;    break;
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

  // Staff tip total
  const tipTotal = orders
    .filter(o => o.tipRecipientId === Number(userId))
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

        <OrdersTabs tabs={tabs} current={tab} onChange={setTab} />

        {role === 'cashier' && (
          <div className={styles.reconcileSection}>
            <h2>Cash Reconciliation</h2>
            <p>Pending orders: {listToShow.length}</p>
            <p>Total cash amount: ${listToShow.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}</p>
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

        <OrdersGrid
          list={listToShow}
          role={role}
          drivers={drivers}
          mutate={mutate}
          onShowDetail={o => setDetail(o)}
          onShowAgePatch={patch => setAgePatch(patch)}
        />

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button disabled={page <= 1}          onClick={() => setPage(p => p - 1)}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>

      <AgeCheckModal
        isOpen={!!agePatch}
        patch={agePatch}
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
