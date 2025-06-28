// File: app/dashboard/driver-dashboard/page.tsx
// ----------------------------------------------------------------------
// Driver Console — Available · My Orders · Delivered · Earnings · Payouts
// ----------------------------------------------------------------------

'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

import styles from './driver.module.css';
import OnlineToggle from '@/components/dashboard/DriverConsole/OnlineToggle';
import { useDriverStatus } from '@/components/dashboard/DriverConsole/useDriverStatus';
import DriverEarnings from './earnings/DriverEarnings';
import { Order as BaseOrder } from '@/contexts/OrderContext';

interface DriverOrder extends Omit<BaseOrder, 'deliveryAddress' | 'orderType'> {
  orderType: string | null;
  driverId?: number | null;
  deliveryAddress?: {
    street: string;
    city:   string;
    state:  string;
    zipCode: string;
  };
  subtotal: number;
  totalDeliveryFee:   number;
  driverPayout:      number;
  tipAmount:         number;
  deliveryDistanceMiles: number;
  deliveryTimeMinutes:   number;
}

interface Payout {
  id:        number;
  amount:    string;
  order?:    { orderId: string };
  paid:      boolean;
  paidAt?:   string;
  createdAt: string;
}

interface Paginated<T> {
  orders:      T[];
  page:        number;
  totalPages:  number;
}

type Tab = 'available' | 'mine' | 'delivered' | 'earnings' | 'payouts';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => r.json());

export default function DriverConsole() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const driverId = session?.user?.id ? Number(session.user.id) : null;

  // 1) Pull online state and toggle function from our hook
  const { online, isValidating: statusLoading, error: statusError, toggleOnline } =
    useDriverStatus(driverId!);

  // tabs, date filters
  const [tab, setTab] = useState<Tab>('available');
  const [from, setFrom] = useState('');
  const [to, setTo]   = useState('');

  // SWR for orders
  const { data: allData = { orders: [] as DriverOrder[] }, mutate: mutateAll } =
    useSWR<Paginated<DriverOrder>>(
      () =>
        driverId !== null
          ? `/api/orders?role=driver&driverId=${driverId}`
          : null,
      fetcher,
      { refreshInterval: 5000 }
    );

  const { data: deliveredData = { orders: [] as DriverOrder[] } } =
    useSWR<Paginated<DriverOrder>>(
      () =>
        driverId !== null
          ? `/api/orders?role=driver&driverId=${driverId}&status=delivered`
          : null,
      fetcher,
      { refreshInterval: 5000 }
    );

  const isDriverOrder = (o: DriverOrder) =>
    o.orderType === 'delivery' ||
    o.totalDeliveryFee > 0 ||
    o.driverPayout > 0;

  const qualified = allData.orders.filter(
    o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED' && isDriverOrder(o)
  );
  const available = qualified.filter(
    o =>
      o.driverId == null &&
      ['ORDER_RECEIVED', 'IN_PROGRESS', 'ORDER_READY'].includes(o.status)
  );
  const mine      = qualified.filter(o => o.driverId === driverId);
  const delivered = deliveredData.orders.filter(isDriverOrder);

  // payouts
  const makePayoutKey = (paid: boolean) =>
    driverId === null
      ? null
      : `/api/payouts?paid=${paid}&userId=${driverId}&mode=driver` +
        (from ? `&from=${from}` : '') +
        (to   ? `&to=${to}`   : '');

  const { data: unpaid = [] as Payout[], mutate: mutateUnpaid } =
    useSWR<Payout[]>(makePayoutKey(false), fetcher);
  const { data: paid = [] as Payout[], mutate: mutatePaid  } =
    useSWR<Payout[]>(makePayoutKey(true),  fetcher);

  const totalUnpaid = unpaid.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid   = paid.reduce((sum, p) => sum + Number(p.amount),   0);

  // claim order via dedicated driver route; disabled when offline
  const claimOrder = async (o: DriverOrder) => {
    if (!driverId || !online) return;
    await fetch(`/api/orders/${o.id}/driver`, {
      method:      'PATCH',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ driverId }),
    });
    await mutateAll();
  };

  // CSV / PDF exports unchanged...
  const exportCSV = () => {
    const head = 'Date,Order ID,Amount,Paid';
    const rows = [
      ...unpaid.map(p =>
        [p.createdAt.slice(0, 10), p.order?.orderId || '', p.amount, 'false'].join(',')
      ),
      ...paid.map(p =>
        [p.paidAt?.slice(0, 10) || '', p.order?.orderId || '', p.amount, 'true'].join(',')
      ),
    ];
    const blob = new Blob([head + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `driver-payouts-${driverId}-${from || 'start'}-${to || 'end'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    if (!driverId) return;
    const qs = new URLSearchParams();
    qs.set('userId', driverId.toString());
    qs.set('paid',   'false');
    if (from) qs.set('from', from);
    if (to)   qs.set('to',   to);

    const res = await fetch(`/api/payouts/pdf?${qs}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `driver-payouts-${driverId}-${from || 'start'}-${to || 'end'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (status === 'loading' || driverId === null) {
    return <div className={styles.loading}>Loading…</div>;
  }

  const listToShow =
    tab === 'available'
      ? available
      : tab === 'mine'
      ? mine
      : tab === 'delivered'
      ? delivered
      : [];

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Driver Console</h1>

      <OnlineToggle driverId={driverId} onStatusChange={() => {}} />

      {!online && (
        <div className={styles.offlineBanner}>
          You’re currently offline.&nbsp;
          <button
            onClick={toggleOnline}
            disabled={statusLoading}
            className={styles.linkButtonInline}
          >
            Go Online →
          </button>
        </div>
      )}

      <nav className={styles.tabs}>
        {(['available','mine','delivered','earnings','payouts'] as Tab[]).map(t => (
          <button
            key={t}
            className={tab === t ? styles.active : ''}
            onClick={() => setTab(t)}
          >
            {t === 'available'
              ? `Available (${available.length})`
              : t === 'mine'
              ? `My Orders (${mine.length})`
              : t === 'delivered'
              ? `Delivered (${delivered.length})`
              : t === 'earnings'
              ? 'Earnings'
              : `Payouts (${unpaid.length + paid.length})`}
          </button>
        ))}
      </nav>

      {tab !== 'earnings' && tab !== 'payouts' && (
        <div className={styles.list}>
          {listToShow.map(o => (
            <div key={o.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.orderId}>#{o.orderId}</span>
                <span className={styles.badge}>{o.status.replace(/_/g,' ')}</span>
              </div>
              <div className={styles.cardBody}>
                <p><strong>Main:</strong> {o.items?.[0]?.title || '—'}</p>
                <p><small>💰 Delivery Fee: ${o.totalDeliveryFee.toFixed(2)}</small></p>
                <p><small>💵 Tip: ${o.tipAmount.toFixed(2)}</small></p>
                <p><small>🏆 Payout: ${o.driverPayout.toFixed(2)}</small></p>
                <p>
                  <small>
                    ⏱ {o.deliveryTimeMinutes} min | 🛣️ {o.deliveryDistanceMiles.toFixed(1)} mi
                  </small>
                </p>
                {tab !== 'delivered' && o.deliveryAddress && (
                  <p className={styles.addr}>
                    <small>
                      Addr: {o.deliveryAddress.street}, {o.deliveryAddress.city}
                    </small>
                  </p>
                )}
              </div>
              <div className={styles.cardFooter}>
                {tab === 'available' && (
                  <button
                    className={styles.btn}
                    onClick={() => claimOrder(o)}
                    disabled={!online}
                  >
                    Claim Order
                  </button>
                )}
                {tab === 'mine' && (
                  <button
                    className={styles.btn}
                    onClick={() =>
                      router.push(`/dashboard/driver-dashboard/order/${o.id}`)
                    }
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          ))}
          {listToShow.length === 0 && (
            <p className={styles.empty}>
              {tab === 'available'
                ? 'No orders available.'
                : tab === 'mine'
                ? 'No active orders.'
                : 'No delivered orders yet.'}
            </p>
          )}
        </div>
      )}

      {tab === 'earnings' && <DriverEarnings driverId={driverId} />}

      {tab === 'payouts' && (
        <div className={styles.payouts}>
          <h2>Unpaid ({unpaid.length})</h2>
          <div className={styles.toolbar}>
            <label>
              From&nbsp;
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className={styles.searchInput}
              />
            </label>
            <label>
              To&nbsp;
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className={styles.searchInput}
              />
            </label>
            <button className={styles.btnOutline} onClick={() => { mutateUnpaid(); mutatePaid(); }}>
              Apply
            </button>
          </div>

          <p className={styles.total}>Total Unpaid: ${totalUnpaid.toFixed(2)}</p>
          <button className={styles.btn} onClick={exportCSV}>Download CSV</button>
          <button className={styles.btn} onClick={downloadPDF}>Download PDF</button>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Created</th>
                <th>Order #</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.map(p => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{p.order?.orderId ?? '—'}</td>
                  <td>${Number(p.amount).toFixed(2)}</td>
                </tr>
              ))}
              {unpaid.length === 0 && (
                <tr><td colSpan={3}>None pending.</td></tr>
              )}
            </tbody>
          </table>

          <h2>Paid ({paid.length})</h2>
          <p className={styles.total}>Total Paid: ${totalPaid.toFixed(2)}</p>
          <button className={styles.btn} onClick={exportCSV}>Download CSV</button>
          <button className={styles.btn} onClick={downloadPDF}>Download PDF</button>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Paid At</th>
                <th>Order #</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {paid.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.paidAt
                      ? new Date(p.paidAt).toLocaleDateString('en-US', {
                          timeZone: 'America/New_York',
                        })
                      : '—'}
                  </td>
                  <td>{p.order?.orderId ?? '—'}</td>
                  <td>${Number(p.amount).toFixed(2)}</td>
                </tr>
              ))}
              {paid.length === 0 && (
                <tr><td colSpan={3}>No payouts yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
