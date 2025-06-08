// File: app/dashboard/driver-dashboard/earnings/DriverEarnings.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import styles from './DriverEarnings.module.css';
import { toast } from 'react-toastify';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ─── Types & helpers ─── */
type CorePeriod = 'day' | 'week' | 'month' | 'year';
type Period     = CorePeriod | 'custom' | 'payouts';

interface Totals {
  totalDeliveryFee?: number;
  tipAmount?:        number;
}

interface Row {
  orderId:              string;
  deliveredAt:          string | null;
  totalDeliveryFee:     number;
  tipAmount:            number;
  deliveryType:         string;
  driverPayout:         number | null;
  deliveryInstructions: string | null;
  tipRecipientId?:      number | null;
}

interface Payout {
  id:       number;
  amount:   number;
  order?:   { orderId: string };
  paidAt:   string;
}

interface Range { from: string; to: string; }

const money = (n?: number | null) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const pretty = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    dateStyle: 'medium',
    timeZone: 'America/New_York',
  });

function getNYDateKey(dt: Date): string {
  const [m, d, y] = dt
    .toLocaleDateString('en-US', { timeZone: 'America/New_York' })
    .split('/');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

function getNYHourKey(dt: Date): string {
  const hour = dt.toLocaleString('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  });
  return `${hour}:00`;
}

const title: Record<CorePeriod, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Annual',
};

type DriverEarningsProps = {
  driverId: number;
  /**
   * When false, hide delivery-fee columns and only show tips (server mode).
   */
  showDeliveryFee?: boolean;
};

export default function DriverEarnings({
  driverId,
  showDeliveryFee = true,
}: DriverEarningsProps) {
  const [period, setPeriod]     = useState<Period>('day');
  const [totals, setTotals]     = useState<Totals>({ totalDeliveryFee: 0, tipAmount: 0 });
  const [rows, setRows]         = useState<Row[]>([]);
  const [range, setRange]       = useState<Range | null>(null);
  const [fromD, setFromD]       = useState('');
  const [toD, setToD]           = useState('');
  const [loading, setLoading]   = useState(false);

  const [payouts, setPayouts]      = useState<Payout[]>([]);
  const [payLoading, setPayLoading] = useState(false);

  /* — fetch earnings or tips — */
  const load = async (p: CorePeriod | 'custom', f?: string, t?: string) => {
    setLoading(true);
    const qs = p === 'custom' ? `from=${f}&to=${t}` : `period=${p}`;
    try {
      const endpoint = showDeliveryFee
        ? `/api/drivers/earnings?driverId=${driverId}&${qs}&orders=true`
        : `/api/servers/earnings?staffId=${driverId}&${qs}&orders=true`;
      const data = await fetch(endpoint).then(r => r.json());

      const {
        totals: newTotals = {},
        orders: fetchedOrders = [],
        range:  newRange = null,
      } = data as { totals?: Totals; orders?: Row[]; range?: Range | null };

      let filtered: Row[] = [];

      if (showDeliveryFee) {
        filtered = fetchedOrders.filter(r =>
          (r.driverPayout ?? 0) > 0 && r.deliveredAt != null
        );
      } else {
        filtered = fetchedOrders.filter(r =>
          r.deliveryType !== 'DELIVERY' &&
          r.tipRecipientId === driverId &&
          r.deliveredAt != null
        );
      }

      const tipSum = filtered.reduce((sum, r) => sum + (r.tipAmount ?? 0), 0);
      const feeSum = showDeliveryFee
        ? filtered.reduce((sum, r) => sum + (r.totalDeliveryFee ?? 0), 0)
        : 0;

      setTotals({ totalDeliveryFee: feeSum, tipAmount: tipSum });
      setRows(filtered);
      setRange(newRange);
    } catch {
      toast.error('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  /* — fetch payouts — */
  const loadPayouts = async () => {
    setPayLoading(true);
    try {
      const data: Payout[] = await fetch(
        `/api/payouts?paid=true&userId=${driverId}`
      ).then(r => r.json());
      setPayouts(data);
    } catch {
      toast.error('Failed to load payouts');
    } finally {
      setPayLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom' && period !== 'payouts') {
      load(period);
    } else if (period === 'payouts') {
      loadPayouts();
    }
  }, [period, showDeliveryFee]);

  /* — chart data — */
  const chart = useMemo(() => {
    if (period === 'payouts' || !rows.length) return null;
    const valid = rows.filter(r => r.deliveredAt);
    if (!valid.length) return null;

    const m = new Map<string, number>();
    valid.forEach(r => {
      const dt = new Date(r.deliveredAt!);
      const key = (period === 'day')
        ? getNYHourKey(dt)
        : getNYDateKey(dt);
      const amount = showDeliveryFee
        ? (r.totalDeliveryFee ?? 0) + (r.tipAmount ?? 0)
        : (r.tipAmount ?? 0);
      m.set(key, (m.get(key) ?? 0) + amount);
    });

    const labels = [...m.keys()].sort();
    return {
      labels,
      datasets: [{ label: 'Earnings ($)', data: labels.map(l => m.get(l)!), borderWidth: 1 }],
    };
  }, [rows, period, showDeliveryFee]);

  /* — CSV export — */
  const exportCSV = () => {
    if (period === 'payouts') return;
    const valid = rows.filter(r => r.deliveredAt);
    if (!valid.length) { toast.warn('No data'); return; }

    const headParts = ['Delivered','Order ID'];
    if (showDeliveryFee) headParts.push('Del.Fee');
    headParts.push('Tips','Total');
    const head = headParts.join(',');

    const body = valid.map(r => {
      const dt = new Date(r.deliveredAt!);
      const delivered = dt.toLocaleDateString('en-US',{ dateStyle:'medium', timeZone:'America/New_York' });
      const parts: Array<string | number> = [delivered, r.orderId];
      if (showDeliveryFee) parts.push(r.totalDeliveryFee ?? 0);
      parts.push(r.tipAmount ?? 0);
      parts.push(showDeliveryFee
        ? (r.totalDeliveryFee ?? 0) + (r.tipAmount ?? 0)
        : (r.tipAmount ?? 0)
      );
      return parts.join(',');
    }).join('\n');

    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `earnings-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeLabel = range
    ? range.from === range.to
      ? pretty(range.from)
      : `${pretty(range.from)} – ${pretty(range.to)}`
    : '';

  const core: CorePeriod[] = ['day','week','month','year'];

  return (
    <div className={styles.container}>
      {range && period !== 'payouts' && (
        <div className={styles.printHeader}>
          <h1>{ showDeliveryFee ? 'Driver' : 'Server' } Earnings Statement</h1>
          <div className={styles.rangeLine}>
            Range: <strong>{rangeLabel}</strong>
          </div>
          <hr/>
        </div>
      )}

      {/* Period tabs */}
      <nav className={styles.tabs}>
        {core.map(p => (
          <button
            key={p}
            className={`${styles.tab} ${period===p?styles.active:''}`}
            onClick={()=>setPeriod(p)}
          >
            {title[p]}
          </button>
        ))}
        <button
          className={`${styles.tab} ${period==='custom'?styles.active:''}`}
          onClick={()=>setPeriod('custom')}
        >
          Custom
        </button>
        <button
          className={`${styles.tab} ${period==='payouts'?styles.active:''}`}
          onClick={()=>setPeriod('payouts')}
        >
          Payouts
        </button>
      </nav>

      {/* Custom date inputs */}
      {period==='custom' && (
        <div className={styles.rangeBar}>
          <label>
            From <input type="date" value={fromD} onChange={e=>setFromD(e.target.value)} />
          </label>
          <label>
            To   <input type="date" value={toD} onChange={e=>setToD(e.target.value)} />
          </label>
          <button onClick={()=>load('custom',fromD,toD)}>Apply</button>
        </div>
      )}

      {/* Payouts table */}
      {period==='payouts' ? (
        payLoading ? (
          <p>Loading payouts…</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Paid At</th><th>Order #</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.paidAt).toLocaleDateString('en-US',{timeZone:'America/New_York'})}</td>
                    <td>{p.order?.orderId||'—'}</td>
                    <td>{money(p.amount)}</td>
                  </tr>
                ))}
                {!payouts.length && (
                  <tr><td colSpan={3} className={styles.empty}>No payouts yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          {/* Totals cards */}
          <div className={styles.cards}>
            {showDeliveryFee && <Card label="Delivery Fees" val={money(totals.totalDeliveryFee)} />}
            <Card label="Tips" val={money(totals.tipAmount)} />
            <Card
              label="Total"
              val={money(
                (showDeliveryFee ? (totals.totalDeliveryFee ?? 0) : 0) +
                (totals.tipAmount ?? 0)
              )}
            />
          </div>

          {/* Earnings chart */}
          {chart && (
            <div className={styles.chartWrap}>
              <Bar data={chart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button onClick={exportCSV} disabled={!rows.some(r => r.deliveredAt)}>Export CSV</button>
            <button onClick={() => window.print()}>Print</button>
          </div>

          {/* Orders table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Delivered</th>
                  <th>Order #</th>
                  {showDeliveryFee && <th>Del.Fee</th>}
                  <th>Tips</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter(r => r.deliveredAt).map(r => (
                  <tr key={r.orderId + r.deliveredAt}>
                    <td>{pretty(r.deliveredAt!)}</td>
                    <td>{r.orderId}</td>
                    {showDeliveryFee && <td>{money(r.totalDeliveryFee)}</td>}
                    <td>{money(r.tipAmount)}</td>
                    <td>{showDeliveryFee
                      ? money((r.totalDeliveryFee ?? 0) + (r.tipAmount ?? 0))
                      : money(r.tipAmount)
                    }</td>
                  </tr>
                ))}
                {!rows.filter(r => r.deliveredAt).length && (
                  <tr>
                    <td colSpan={showDeliveryFee ? 5 : 4} className={styles.empty}>No data.</td>
                  </tr>
                )}
              </tbody>
              {rows.filter(r => r.deliveredAt).length > 0 && (
                <tfoot>
                  <tr>
                    <th className={styles.footerCell}>Totals</th><th></th>
                    {showDeliveryFee && <th className={styles.footerCell}>{money(totals.totalDeliveryFee)}</th>}
                    <th className={styles.footerCell}>{money(totals.tipAmount)}</th>
                    <th className={styles.footerCell}>
                      {money(
                        (showDeliveryFee ? (totals.totalDeliveryFee ?? 0) : 0) +
                        (totals.tipAmount ?? 0)
                      )}
                    </th>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {/* Loading state */}
      {loading && period !== 'payouts' && <p>Loading…</p>}
    </div>
  );
}

function Card({ label, val }: { label: string; val: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardVal}>{val}</span>
    </div>
  );
}
