// File: components/dashboard/OrdersDashboard/OrdersDashboard.tsx
'use client';


import React, { useEffect, useState, Dispatch, SetStateAction } from 'react';
import useSWR from 'swr';
import { ToastContainer, toast } from 'react-toastify';


import styles from './OrdersDashboard.module.css';
import DashboardHeader from './DashboardHeader';
import SearchAndFilter from './SearchAndFilter';
import OnlineDrivers from './OnlineDrivers';
import PendingCashSection from './PendingCashSection';
import CashReconciliationSection from './CashReconciliationSection';
import ReconciledHistorySection from './ReconciledHistorySection';
import OrdersGridWrapper from './OrdersGridWrapper';
import PaginationControls from './PaginationControls';
import OrdersTabs, { TabKey, Tab } from './OrdersTabs';
import DetailModal from './DetailModal';
import AgeCheckModal from './AgeCheckModal';
import StatementView from './StatementView';


import { fetcher, useDebounce } from './utils';
import { useOrders } from './hooks/useOrders';
import { useCashCollections } from './hooks/useCashCollections';
import { useReconciledRecords } from './hooks/useReconciledRecords';


import type {
  Order,
  CashCollectionRecord,
  ServerAgg,
  OrdersListResponse,
} from './types';
import type { Driver } from './DriverAssigner';
import type { KeyedMutator } from 'swr';


export interface OrdersDashboardProps {
  role: 'admin' | 'staff' | 'server' | 'cashier';
  userId?: string | number;
}


const PAGE_SIZE = 20;


export default function OrdersDashboard({
  role,
  userId,
}: OrdersDashboardProps) {
  // Search & filter state
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [serverFilter, setServerFilter] = useState('');


  // Tab & pagination state
  const [tab, setTab] = useState<TabKey>(
    role === 'cashier'
      ? 'toReconcile'
      : role === 'staff'
      ? 'received'
      : role === 'server'
      ? 'ready'
      : 'active'
  );
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [tab, debouncedQuery, serverFilter]);


  // Detail / modals state
  const [detail, setDetail] = useState<Order | null>(null);
  const [agePatch, setAgePatch] = useState<{
    order: Order;
    nextStatus: string;
    msg: string;
  } | null>(null);
  const [cashInput, setCashInput] = useState('');


  // Cashier’s server dropdown
  const { data: serverAgg = [] } = useSWR<ServerAgg[]>(
    role === 'cashier'
      ? '/api/orders/cash-collections?groupBy=server'
      : null,
    fetcher,
    { refreshInterval: 10000 }
  );


  // Paginated orders fetch
  const { orders, totalPages, mutate } = useOrders({
    role,
    userId,
    page,
    limit: PAGE_SIZE,
    query: debouncedQuery,
    serverFilter,
    reconciledFlag: tab === 'reconciled',
  });


  // Live driver & cash data
  const { data: drivers = [] } = useSWR<Driver[]>(
    role === 'admin' || role === 'staff'
      ? '/api/drivers?status=online'
      : null,
    fetcher,
    { refreshInterval: 30000 }
  );
  const { records: pendingCash } = useCashCollections({
    serverId: role === 'server' ? userId : undefined,
    status: 'PENDING',
  });
  const { records: reconciledRecords } = useReconciledRecords({
    cashierId: role === 'cashier' ? userId : undefined,
  });


  // Buckets & totals
  const filterBy = (statuses: Order['status'][]) =>
    orders.filter((o) => statuses.includes(o.status));


  const received  = filterBy(['ORDER_RECEIVED']);
  const inPrep    = filterBy(['IN_PROGRESS']);
  const ready     = filterBy(['ORDER_READY']);
  const enRoute   = filterBy(['PICKED_UP_BY_DRIVER']);
  const delivered = filterBy(['DELIVERED']);
  const pending   = filterBy(['PENDING_PAYMENT']);
  const cancelled = filterBy(['CANCELLED']);
  const active    = orders.filter(
    (o) =>
      !['PENDING_PAYMENT', 'ORDER_READY', 'DELIVERED', 'CANCELLED'].includes(
        o.status
      )
  );
  const completed   = delivered;
  const toReconcile = orders.filter(
    (o) => o.cashCollection?.status === 'PENDING'
  );


  const expectedTotal = toReconcile.reduce((sum, o) => sum + o.totalAmount, 0);
  const diff = Number(cashInput) - expectedTotal;


  const tipTotal = orders
    .filter(
      (o) =>
        o.tipRecipientId === Number(userId) &&
        o.deliveryType !== 'DELIVERY' &&
        (o.driverPayout ?? 0) !== 0 &&
        o.deliveryInstructions != null
    )
    .reduce((sum, o) => sum + (o.tipAmount ?? 0), 0);


  // Tabs metadata
  const tabs: Tab[] =
    role === 'staff'
      ? [
          { key: 'received',  label: 'Received',  count: received.length  },
          { key: 'inPrep',    label: 'In Prep',   count: inPrep.length    },
          { key: 'ready',     label: 'Ready',     count: ready.length     },
          { key: 'completed', label: 'Completed', count: completed.length },
        ]
      : role === 'server'
      ? [
          { key: 'ready',      label: 'Ready to Serve', count: ready.length    },
          { key: 'enRoute',    label: 'En Route',       count: enRoute.length  },
          { key: 'delivered',  label: 'Delivered',      count: delivered.length},
          { key: 'pendingCash',label: 'Pending Cash',   count: pendingCash.length },
        ]
      : role === 'cashier'
      ? [
          { key: 'toReconcile', label: 'To Reconcile', count: toReconcile.length    },
          { key: 'reconciled',  label: 'Reconciled',   count: reconciledRecords.length },
        ]
      : [
          { key: 'active',    label: 'Active',   count: active.length    },
          { key: 'pending',   label: 'Pending',  count: pending.length   },
          { key: 'ready',     label: 'Ready',    count: ready.length     },
          { key: 'completed', label: 'Completed',count: completed.length },
          { key: 'cancelled', label: 'Cancelled',count: cancelled.length },
        ];


  // Map for current tab’s list
  const listMap: Record<TabKey, Order[]> = {
    received,
    inPrep,
    ready,
    enRoute,
    delivered,
    active,
    pending,
    completed,
    cancelled,
    toReconcile,
    reconciled: [],   // handled by ReconciledHistorySection
    pendingCash: [],  // handled by PendingCashSection
  };
  const listToShow = listMap[tab] ?? [];


  // Cashier reconciliation handler
  const handleReconcile = async () => {
    if (diff < 0) {
      toast.error(
        `Mismatch: expected $${expectedTotal.toFixed(2)} but you entered $${cashInput}`,
        { autoClose: 3000 }
      );
      return;
    }
    const t = toast.loading('Reconciling cash…');
    try {
      const res = await fetch('/api/orders/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds:     listToShow.map((o) => o.orderId),
          cashReceived: Number(cashInput),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const msg =
        diff > 0
          ? `Reconciled • change due $${diff.toFixed(2)}`
          : 'Reconciled';
      toast.update(t, { render: msg, type: 'success', isLoading: false, autoClose: 1800 });
      setCashInput('');
      mutate();
    } catch (err: any) {
      toast.update(t, { render: err.message, type: 'error', isLoading: false });
    }
  };


  return (
    <>
      <ToastContainer position="top-right" theme="colored" />


      <div className={styles.container}>
        {/* Header */}
        <DashboardHeader role={role} tipTotal={tipTotal} />


        {/* Search & Filters */}
        <SearchAndFilter
          role={role}
          query={query}
          onQueryChange={setQuery}
          serverFilter={serverFilter}
          onServerFilterChange={setServerFilter}
          serverAgg={serverAgg}
        />


        {/* Tabs */}
        <OrdersTabs tabs={tabs} current={tab} onChange={setTab} />


        {/* Inline widgets */}
        {(role === 'admin' || role === 'staff') && (
          <OnlineDrivers drivers={drivers} />
        )}
        {role === 'server' && tab === 'pendingCash' && (
          <PendingCashSection pendingCash={pendingCash as CashCollectionRecord[]} />
        )}
        {role === 'cashier' && tab === 'toReconcile' && (
          <CashReconciliationSection
            toReconcile={toReconcile}
            cashInput={cashInput}
            onCashInputChange={setCashInput}
            diff={diff}
            expectedTotal={expectedTotal}
            onReconcile={handleReconcile}
          />
        )}
        {role === 'cashier' && tab === 'reconciled' && (
          <ReconciledHistorySection reconciledRecords={reconciledRecords} />
        )}


        {/* Delivered/Completed → StatementView; else → OrdersGridWrapper */}
        {(tab === 'delivered' || tab === 'completed') ? (
          <StatementView
            list={listToShow}
            onShowDetail={setDetail as Dispatch<SetStateAction<Order>>}
          />
        ) : (
          <OrdersGridWrapper
            role={role}
            tab={tab}
            list={listToShow}
            drivers={drivers}
            serverId={role === 'server' ? Number(userId) : undefined}
            mutate={mutate as unknown as () => Promise<any>}
            onShowDetail={setDetail as Dispatch<SetStateAction<Order>>}
            onShowAgePatch={setAgePatch}
          />
        )}


        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>


      {/* Detail Modal */}
      <DetailModal
        isOpen={Boolean(detail)}
        order={detail}
        role={role}
        onClose={() => setDetail(null)}
      />


      {/* Age-Check Modal */}
      <AgeCheckModal
        isOpen={Boolean(agePatch)}
        patch={agePatch}
        onClose={() => setAgePatch(null)}
        onDone={() => {
          mutate();
          setAgePatch(null);
        }}
      />
    </>
  );
}



