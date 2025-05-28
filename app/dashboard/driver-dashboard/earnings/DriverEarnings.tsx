// File: app/dashboard/driver-dashboard/earnings/DriverEarnings.tsx
// Description: Driver Earnings & Payouts — shows earnings charts for day/week/month/year/custom, 
// and a new “Payouts” tab listing that driver’s paid payouts.

// Ensures all dates/times use America/New_York timezone.

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
  totalDeliveryFee?: number | null;
  tipAmount?:        number | null;
}

interface Row {
  orderId:          string;
  deliveredAt:      string | null;
  totalDeliveryFee: number;
  tipAmount:        number;
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

// Format a Date to 'MMM d, yyyy' in New York time
const pretty = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    dateStyle: 'medium',
    timeZone: 'America/New_York',
  });

// Get an ISO-style YYYY-MM-DD key based on New York date
function getNYDateKey(dt: Date): string {
  const [m, d, y] = dt.toLocaleDateString('en-US', { timeZone: 'America/New_York' }).split('/');
  const mm = m.padStart(2, '0'), dd = d.padStart(2, '0'), yyyy = y;
  return `${yyyy}-${mm}-${dd}`;
}

// Get hour bucket like "HH:00" based on New York time
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

export default function DriverEarnings({ driverId }: { driverId: number }) {
  const [period, setPeriod]     = useState<Period>('day');
  const [totals, setTotals]     = useState<Totals>({});
  const [rows, setRows]         = useState<Row[]>([]);
  const [range, setRange]       = useState<Range | null>(null);
  const [fromD, setFromD]       = useState('');
  const [toD, setToD]           = useState('');
  const [loading, setLoading]   = useState(false);

  const [payouts, setPayouts]   = useState<Payout[]>([]);
  const [payLoading, setPayLoading] = useState(false);

  /* — fetch earnings — */
  const load = async (p: CorePeriod | 'custom', f?: string, t?: string) => {
    setLoading(true);
    const qs = p === 'custom' ? `from=${f}&to=${t}` : `period=${p}`;
    try {
      const data = await fetch(
        `/api/drivers/earnings?driverId=${driverId}&${qs}&orders=true`
      ).then(r => r.json());
      const {
        totals: newTotals = {},
        orders: fetchedOrders = [],
        range:  newRange = null,
      } = data;
      setTotals(newTotals);
      setRows(fetchedOrders);
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
  }, [period]);

  /* — chart data — */
  const chart = useMemo(() => {
    if (period === 'payouts' || !rows.length) return null;
    const valid = rows.filter(r => r.deliveredAt);
    if (!valid.length) return null;

    const m = new Map<string, number>();
    valid.forEach(r => {
      const dt = new Date(r.deliveredAt!);
      const key =
        period === 'day'
          ? getNYHourKey(dt)
          : getNYDateKey(dt);
      m.set(key, (m.get(key) ?? 0) + r.totalDeliveryFee + r.tipAmount);
    });

    const labels = [...m.keys()].sort();
    return {
      labels,
      datasets: [{
        label: 'Earnings ($)',
        data: labels.map(l => m.get(l)!),
        borderWidth: 1,
      }],
    };
  }, [rows, period]);

  /* — CSV export — */
  const exportCSV = () => {
    if (period === 'payouts') return;
    const valid = rows.filter(r => r.deliveredAt);
    if (!valid.length) { toast.warn('No data'); return; }

    const head = 'Delivered,Order ID,Del.Fee,Tips,Total';
    const body = valid.map(r => {
      const dt = new Date(r.deliveredAt!);
      const delivered = dt.toLocaleDateString('en-US', {
        dateStyle: 'medium',
        timeZone: 'America/New_York',
      });
      return [
        delivered,
        r.orderId,
        r.totalDeliveryFee,
        r.tipAmount,
        r.totalDeliveryFee + r.tipAmount,
      ].join(',');
    }).join('\n');

    const blob = new Blob([head + '\n' + body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `driver-earnings-${period}.csv`;
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
          <h1>Driver Earnings Statement</h1>
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
            From <input
              type="date"
              value={fromD}
              onChange={e=>setFromD(e.target.value)}
            />
          </label>
          <label>
            To   <input
              type="date"
              value={toD}
              onChange={e=>setToD(e.target.value)}
            />
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
                <tr>
                  <th>Paid At</th>
                  <th>Order #</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id}>
                    <td>
                      {new Date(p.paidAt).toLocaleDateString('en-US', {
                        timeZone: 'America/New_York',
                      })}
                    </td>
                    <td>{p.order?.orderId || '—'}</td>
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
            <Card label="Delivery Fees" val={money(totals.totalDeliveryFee)} />
            <Card label="Tips"          val={money(totals.tipAmount)} />
            <Card label="Total"
                  val={money((totals.totalDeliveryFee ?? 0) + (totals.tipAmount ?? 0))}
            />
          </div>

          {/* Earnings chart */}
          {chart && (
            <div className={styles.chartWrap}>
              <Bar
                data={chart}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false }
                  }
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button onClick={exportCSV} disabled={!rows.some(r => r.deliveredAt)}>
              Export CSV
            </button>
            <button onClick={() => window.print()}>
              Print
            </button>
          </div>

          {/* Orders table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Delivered</th>
                  <th>Order #</th>
                  <th>Del.Fee</th>
                  <th>Tips</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter(r => r.deliveredAt).map(r => (
                  <tr key={r.orderId + r.deliveredAt}>
                    <td>{pretty(r.deliveredAt!)}</td>
                    <td>{r.orderId}</td>
                    <td>{money(r.totalDeliveryFee)}</td>
                    <td>{money(r.tipAmount)}</td>
                    <td>{money(r.totalDeliveryFee + r.tipAmount)}</td>
                  </tr>
                ))}
                {!rows.filter(r => r.deliveredAt).length && (
                  <tr><td colSpan={5} className={styles.empty}>No data.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th className={styles.footerCell}>Totals</th>
                  <th></th>
                  <th className={styles.footerCell}>{money(totals.totalDeliveryFee)}</th>
                  <th className={styles.footerCell}>{money(totals.tipAmount)}</th>
                  <th className={styles.footerCell}>
                    {money((totals.totalDeliveryFee ?? 0) + (totals.tipAmount ?? 0))}
                  </th>
                </tr>
              </tfoot>
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
