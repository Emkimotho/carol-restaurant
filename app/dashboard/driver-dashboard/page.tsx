// File: app/dashboard/driver-dashboard/page.tsx
// ----------------------------------------------------------------------
// Driver Console — Available · My Orders · Delivered · Earnings · Payouts
// (Includes CSV and PDF download of payouts; drivers cannot delete paid records.)
// ----------------------------------------------------------------------

'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import styles from './driver.module.css';
import DriverEarnings from './earnings/DriverEarnings';
import { Order as BaseOrder } from '@/contexts/OrderContext';

interface DriverOrder extends Omit<BaseOrder, 'deliveryAddress' | 'orderType'> {
  orderType: string | null;
  driverId?: number | null;
  deliveryAddress?: { street: string; city: string; state: string; zipCode: string };
  subtotal: number;
  totalDeliveryFee: number;
  driverPayout: number;
  tipAmount: number;
  deliveryDistanceMiles: number;
  deliveryTimeMinutes: number;
}

interface Payout {
  id: number;
  amount: string;
  order?: { orderId: string };
  paid: boolean;
  paidAt?: string;
  createdAt: string;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => r.json());

interface Paginated<T> {
  orders: T[];
  page: number;
  totalPages: number;
}

type Tab = 'available' | 'mine' | 'delivered' | 'earnings' | 'payouts';

export default function DriverConsole() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const driverId = session?.user?.id ? Number(session.user.id) : null;
  const [tab, setTab] = useState<Tab>('available');

  // Fetch active orders (paginated)
  const { data: activeData, mutate } = useSWR<Paginated<DriverOrder>>(
    () => driverId !== null ? `/api/orders?role=driver&driverId=${driverId}` : null,
    fetcher,
    { refreshInterval: 5000 }
  );
  const active = activeData?.orders ?? [];

  // Fetch delivered orders
  const { data: deliveredData } = useSWR<Paginated<DriverOrder>>(
    () => driverId !== null
      ? `/api/orders?role=driver&driverId=${driverId}&status=delivered`
      : null,
    fetcher
  );
  const deliveredList = deliveredData?.orders ?? [];

  // Filter logic
  const notCancelled = active.filter((o) => o.status !== 'CANCELLED');
  const isDriverOrder = (o: DriverOrder) =>
    o.orderType === 'delivery' || o.totalDeliveryFee > 0 || o.driverPayout > 0;
  const qualified = notCancelled.filter(isDriverOrder);
  const available = qualified.filter((o) => o.driverId == null);
  const mine = qualified.filter(
    (o) => o.driverId === driverId && !['DELIVERED', 'CANCELLED'].includes(o.status)
  );
  const delivered = deliveredList.filter(isDriverOrder);

  // Payout date range
  const [from, setFrom] = useState<string>('');
  const [to, setTo]     = useState<string>('');

  // Payout fetch keys
  const unpaidKey =
    driverId !== null
      ? `/api/payouts?paid=false&userId=${driverId}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`
      : null;
  const paidKey =
    driverId !== null
      ? `/api/payouts?paid=true&userId=${driverId}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`
      : null;

  const { data: unpaid = [], mutate: mutateUnpaid } = useSWR<Payout[]>(unpaidKey, fetcher);
  const { data: paid = [],   mutate: mutatePaid   } = useSWR<Payout[]>(paidKey,   fetcher);

  // Totals
  const totalUnpaid = unpaid.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid   = paid.reduce((sum, p) => sum + Number(p.amount), 0);

  // CSV export
  const exportCSV = () => {
    const head = 'Date,Order ID,Amount,Paid';
    const rows = [
      ...unpaid.map((p) =>
        [p.createdAt.slice(0,10), p.order?.orderId || '', p.amount, 'false'].join(',')
      ),
      ...paid.map((p) =>
        [(p.paidAt?.slice(0,10) ?? ''), p.order?.orderId || '', p.amount, 'true'].join(',')
      ),
    ];
    const blob = new Blob([head + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `driver-payouts-${driverId}-${from||'start'}-${to||'end'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF download
  const downloadPDF = async () => {
    if (!driverId) return;
    const qs = new URLSearchParams();
    qs.set('userId', driverId.toString());
    qs.set('paid', 'false');
    if (from) qs.set('from', from);
    if (to)   qs.set('to', to);
    const res = await fetch(`/api/payouts/pdf?${qs.toString()}`, { method: 'GET' });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `driver-payouts-${driverId}-${from||'start'}-${to||'end'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Accept/start order
  const startOrder = async (o: DriverOrder) => {
    await fetch(`/api/orders/${o.id}/accept`, { method: 'PATCH' });
    mutate();
    router.push(`/dashboard/driver-dashboard/order/${o.id}`);
  };

  if (status === 'loading' || driverId === null) {
    return <div className={styles.wrapper}>Loading…</div>;
  }

  const list =
    tab === 'available' ? available
      : tab === 'mine'      ? mine
      : tab === 'delivered' ? delivered
      : [];

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Driver Console</h1>

      <nav className={styles.tabs}>
        {(['available','mine','delivered','earnings','payouts'] as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? styles.active : ''}
            onClick={() => setTab(t)}
          >
            {t === 'available' ? `Available (${available.length})`
           : t === 'mine'      ? `My Orders (${mine.length})`
           : t === 'delivered' ? `Delivered (${delivered.length})`
           : t === 'earnings'  ? 'Earnings'
           :                     `Payouts (${unpaid.length + paid.length})`}
          </button>
        ))}
      </nav>

      {/* Orders & Earnings */}
      {tab !== 'earnings' && tab !== 'payouts' && (
        <div className={styles.list}>
          {list.map((o) => (
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
                <p><small>⏱ {o.deliveryTimeMinutes} min | 🛣️ {o.deliveryDistanceMiles.toFixed(1)} miles</small></p>
                {tab !== 'delivered' && o.deliveryAddress && (
                  <p className={styles.addr}>
                    <small>Addr: {o.deliveryAddress.street}, {o.deliveryAddress.city}</small>
                  </p>
                )}
              </div>
              <div className={styles.cardFooter}>
                {tab === 'available' ? (
                  <button className={styles.btn} onClick={() => startOrder(o)}>
                    Start Order
                  </button>
                ) : tab === 'mine' ? (
                  <button
                    className={styles.btnOutline}
                    onClick={() => router.push(`/dashboard/driver-dashboard/order/${o.id}`)}
                  >
                    Continue
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          {!list.length && (
            <p className={styles.empty}>
              {tab === 'available' ? 'No orders available.' 
             : tab === 'mine'      ? 'No active orders.' 
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
                onChange={(e) => setFrom(e.target.value)}
                className={styles.searchInput}
              />
            </label>
            <label>
              To&nbsp;
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={styles.searchInput}
              />
            </label>
            <button
              className={styles.button}
              onClick={() => { mutateUnpaid(); mutatePaid(); }}
            >
              Apply
            </button>
          </div>
          <p className={styles.total}>Total Unpaid: ${totalUnpaid.toFixed(2)}</p>
          <button className={styles.button} onClick={exportCSV}>
            Download CSV
          </button>
          <button className={styles.button} onClick={downloadPDF}>
            Download PDF
          </button>
          <table className={styles.table}>
            <thead>
              <tr><th>Created</th><th>Order #</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {unpaid.map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>{p.order?.orderId || '—'}</td>
                  <td>${Number(p.amount).toFixed(2)}</td>
                </tr>
              ))}
              {!unpaid.length && <tr><td colSpan={3}>None pending.</td></tr>}
            </tbody>
          </table>

          <h2>Paid ({paid.length})</h2>
          <p className={styles.total}>Total Paid: ${totalPaid.toFixed(2)}</p>
          <button className={styles.button} onClick={exportCSV}>
            Download CSV
          </button>
          <button className={styles.button} onClick={downloadPDF}>
            Download PDF
          </button>
          <table className={styles.table}>
            <thead>
              <tr><th>Paid At</th><th>Order #</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {paid.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.paidAt
                      ? new Date(p.paidAt).toLocaleDateString("en-US",{ timeZone:"America/New_York" })
                      : "—"}
                  </td>
                  <td>{p.order?.orderId || '—'}</td>
                  <td>${Number(p.amount).toFixed(2)}</td>
                </tr>
              ))}
              {!paid.length && <tr><td colSpan={3}>No payouts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
