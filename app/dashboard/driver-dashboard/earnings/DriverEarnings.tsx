// File: app/dashboard/driver-dashboard/earnings/DriverEarnings.tsx
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { toast } from 'react-toastify';

import styles       from './DriverEarnings.module.css';
import PrintLayout  from '@/components/PrintLayout';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ────────── Types ────────────────────────────────────────────────────── */

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
  id:        number;
  amount:    number;
  paidAt?:   string;
  createdAt: string;
  order?:    { orderId: string; totalDeliveryFee?: number };
}

interface Range { from: string; to: string; }

interface DriverEarningsProps {
  driverId: number;
  /** server-mode flag (hide delivery-fee cols) */
  showDeliveryFee?: boolean;
}

/* ────────── Helpers ──────────────────────────────────────────────────── */

const money = (n?: number | null) =>
  (n ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** ‘MMM d, yyyy’ formatted in America/New_York */
const pretty = (iso?: string | number) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        dateStyle: 'medium',
        timeZone : 'America/New_York',
      })
    : '—';

const nyDateKey = (d: Date) =>
  d.toLocaleDateString('en-US', { timeZone: 'America/New_York' })
    .split('/')
    .reduce(
      (acc, v, i) => (i === 0 ? `${acc}-${v.padStart(2, '0')}` : i === 1 ? `${v.padStart(2, '0')}${acc}` : v),
      '',
    ); // yyyy-mm-dd

const nyHourKey = (d: Date) =>
  `${d.toLocaleString('en-US', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  })}:00`;

const PERIOD_LABEL: Record<CorePeriod, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Annual',
};

/* ═══════════════════════════════════════════════════════════════════════ */
/*                            Component                                    */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function DriverEarnings({
  driverId,
  showDeliveryFee = true,
}: DriverEarningsProps): ReactElement {

  /* ─── State ────────────────────────────────────────────────────────── */
  const [period, setPeriod]   = useState<Period>('day');
  const [rows,   setRows]     = useState<Row[]>([]);
  const [totals, setTotals]   = useState<Totals>({ totalDeliveryFee: 0, tipAmount: 0 });
  const [range,  setRange]    = useState<Range | null>(null);

  /* custom range */
  const [fromD, setFromD] = useState('');
  const [toD,   setToD]   = useState('');

  /* loading flags */
  const [loading,    setLoading]    = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  /* payouts */
  const [unpaidPayouts, setUnpaidPayouts] = useState<Payout[]>([]);
  const [paidPayouts,   setPaidPayouts]   = useState<Payout[]>([]);

  /* ─── Fetch earnings/orders ─────────────────────────────────────────── */

  const load = useCallback(
    async (p: CorePeriod | 'custom', f?: string, t?: string) => {
      setLoading(true);
      const qs = p === 'custom' && f && t ? `from=${f}&to=${t}` : `period=${p}`;

      try {
        const url = showDeliveryFee
          ? `/api/drivers/earnings?driverId=${driverId}&${qs}&orders=true`
          : `/api/servers/earnings?staffId=${driverId}&${qs}&orders=true`;

        const res  = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load earnings');

        const { totals: newTotals = {}, orders = [], range: newRange = null } = data;

        /* mode-specific filtering */
        const filtered: Row[] = orders.filter((r: Row) =>
          !r.deliveredAt ? false
          : showDeliveryFee
              ? (r.totalDeliveryFee ?? 0) > 0
              : r.deliveryType !== 'DELIVERY' && r.tipRecipientId === driverId
        );

        setTotals({
          totalDeliveryFee: filtered.reduce((s, r) => s + (r.totalDeliveryFee ?? 0), 0),
          tipAmount:        filtered.reduce((s, r) => s + (r.tipAmount        ?? 0), 0),
        });
        setRows(filtered);
        setRange(newRange);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to load earnings');
      } finally {
        setLoading(false);
      }
    },
    [driverId, showDeliveryFee],
  );

  /* ─── Fetch payouts ─────────────────────────────────────────────────── */

  const loadPayouts = useCallback(
    async (f?: string, t?: string) => {
      setPayLoading(true);
      try {
        const mode = showDeliveryFee ? 'driver' : 'server';
        const build = (paid: boolean) =>
          `/api/payouts?paid=${paid}&userId=${driverId}&mode=${mode}` +
          (f ? `&from=${f}` : '') +
          (t ? `&to=${t}`  : '');

        const [unpaidJson, paidJson] = await Promise.all([
          fetch(build(false)).then(r => r.json()),
          fetch(build(true)).then(r => r.json()),
        ]);

        if (!Array.isArray(unpaidJson) || !Array.isArray(paidJson))
          throw new Error('Bad payouts response');

        const filter = (arr: Payout[], wantFee: boolean) =>
          arr.filter(p =>
            wantFee
              ? (p.order?.totalDeliveryFee ?? 0) > 0
              : (p.order?.totalDeliveryFee ?? 0) === 0,
          );

        setUnpaidPayouts(filter(unpaidJson, showDeliveryFee));
        setPaidPayouts  (filter(paidJson,   showDeliveryFee));

      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to load payouts');
      } finally {
        setPayLoading(false);
      }
    },
    [driverId, showDeliveryFee],
  );

  /* ─── Effect orchestration ──────────────────────────────────────────── */
  useEffect(() => {
    if (period === 'payouts') loadPayouts(fromD, toD);
    else if (period !== 'custom') load(period);
  }, [period, load, loadPayouts]);

  useEffect(() => {
    if (period === 'payouts') loadPayouts(fromD, toD);
  }, [fromD, toD, period, loadPayouts]);

  /* ─── Chart data (memoised) ─────────────────────────────────────────── */
  const chart = useMemo(() => {
    if (period === 'payouts' || rows.length === 0) return null;

    const bucket = new Map<string, number>();
    rows.forEach(r => {
      if (!r.deliveredAt) return;
      const d   = new Date(r.deliveredAt);
      const key = period === 'day' ? nyHourKey(d) : nyDateKey(d);
      const amt = (r.tipAmount ?? 0) + (showDeliveryFee ? (r.totalDeliveryFee ?? 0) : 0);
      bucket.set(key, (bucket.get(key) ?? 0) + amt);
    });

    const labels = [...bucket.keys()].sort();

    return {
      labels,
      datasets: [
        {
          label: 'Earnings ($)',
          data : labels.map(l => bucket.get(l)!),
          borderWidth: 1,
        },
      ],
    };
  }, [rows, period, showDeliveryFee]);

  /* ─── CSV export (memoised) ─────────────────────────────────────────── */
  const exportCSV = useCallback(() => {
    if (period === 'payouts') return;

    const delivered = rows.filter(r => r.deliveredAt);
    if (!delivered.length) {
      toast.warn('No data');
      return;
    }

    const head = [
      'Delivered',
      'Order ID',
      ...(showDeliveryFee ? ['Del.Fee'] : []),
      'Tips',
      'Total',
    ].join(',');

    const body = delivered
      .map(r => {
        const cols: (string | number)[] = [
          pretty(r.deliveredAt!),
          r.orderId,
          ...(showDeliveryFee ? [r.totalDeliveryFee ?? 0] : []),
          r.tipAmount ?? 0,
          (showDeliveryFee ? (r.totalDeliveryFee ?? 0) : 0) + (r.tipAmount ?? 0),
        ];
        return cols.join(',');
      })
      .join('\n');

    const blob = new Blob([head, '\n', body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `earnings-${period}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [period, rows, showDeliveryFee]);

  /* ─── UI helpers ────────────────────────────────────────────────────── */
  const rangeLabel =
    range && period !== 'payouts'
      ? `${pretty(range.from)} – ${pretty(range.to)}`
      : undefined;

  /* ─── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="earnings-print-zone">
      <PrintLayout rangeLabel={rangeLabel}>
        <div className={styles.container}>

          {rangeLabel && (
            <div className={styles.printHeader}>
              <h1>{showDeliveryFee ? 'Driver' : 'Server'} Earnings Statement</h1>
              <div className={styles.rangeLine}>
                Range: <strong>{rangeLabel}</strong>
              </div>
              <hr />
            </div>
          )}

          {/* ─ Tabs ─ */}
          <nav className={`${styles.tabs} no-print`}>
            {(['day', 'week', 'month', 'year'] as CorePeriod[]).map(p => (
              <button
                key={p}
                className={`${styles.tab} ${period === p ? styles.active : ''}`}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
            <button
              className={`${styles.tab} ${period === 'custom'  ? styles.active : ''}`}
              onClick={() => setPeriod('custom')}
            >
              Custom
            </button>
            <button
              className={`${styles.tab} ${period === 'payouts' ? styles.active : ''}`}
              onClick={() => setPeriod('payouts')}
            >
              Payouts
            </button>
          </nav>

          {/* ─ Custom range inputs ─ */}
          {period === 'custom' && (
            <div className={`${styles.rangeBar} no-print`}>
              <label>
                From{' '}
                <input type="date" value={fromD} onChange={e => setFromD(e.target.value)} />
              </label>
              <label>
                To{' '}
                <input type="date" value={toD} onChange={e => setToD(e.target.value)} />
              </label>
              <button onClick={() => load('custom', fromD, toD)}>Apply</button>
            </div>
          )}

          {/* ─ Payouts view ─ */}
          {period === 'payouts' ? (
            payLoading ? (
              <p aria-live="polite">Loading payouts…</p>
            ) : (
              <>
                {/* Range bar inside payouts (for filtering) */}
                <div className={`${styles.rangeBar} no-print`}>
                  <label>
                    From{' '}
                    <input type="date" value={fromD} onChange={e => setFromD(e.target.value)} />
                  </label>
                  <label>
                    To{' '}
                    <input type="date" value={toD} onChange={e => setToD(e.target.value)} />
                  </label>
                  <button onClick={() => loadPayouts(fromD, toD)}>Apply</button>
                </div>

                {/* Unpaid */}
                <PayoutTable
                  caption="Unpaid"
                  rows={unpaidPayouts}
                  emptyMsg="No unpaid payouts."
                />

                {/* Paid */}
                <PayoutTable
                  caption="Paid"
                  rows={paidPayouts}
                  emptyMsg="No paid payouts."
                />
              </>
            )
          ) : (
            <>
              {/* KPI cards */}
              <div className={styles.cards}>
                {showDeliveryFee && (
                  <Card label="Delivery Fees" val={money(totals.totalDeliveryFee)} />
                )}
                <Card label="Tips"  val={money(totals.tipAmount)} />
                <Card
                  label="Total"
                  val={money(
                    (showDeliveryFee ? totals.totalDeliveryFee ?? 0 : 0) +
                    (totals.tipAmount ?? 0),
                  )}
                />
              </div>

              {/* Chart */}
              {chart && (
                <div className={styles.chartWrap}>
                  <Bar
                    data={chart}
                    options={{ responsive: true, plugins: { legend: { display: false } } }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className={`${styles.actions} no-print`}>
                <button
                  onClick={exportCSV}
                  disabled={!rows.some(r => r.deliveredAt)}
                >
                  Export CSV
                </button>
                <button onClick={() => window.print()}>Print</button>
              </div>

              {/* Orders table */}
              <OrdersTable
                rows={rows}
                showDeliveryFee={showDeliveryFee}
                totals={totals}
              />
            </>
          )}

          {loading && period !== 'payouts' && (
            <p aria-live="polite">Loading…</p>
          )}
        </div>
      </PrintLayout>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*                                Sub-components                           */
/* ═══════════════════════════════════════════════════════════════════════ */

function Card({ label, val }: { label: string; val: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardVal}>{val}</span>
    </div>
  );
}

function OrdersTable({
  rows,
  showDeliveryFee,
  totals,
}: {
  rows: Row[];
  showDeliveryFee: boolean;
  totals: Totals;
}) {
  if (!rows.length)
    return <p className={styles.noData}>No data.</p>;

  const delivered = rows.filter(r => r.deliveredAt);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Delivered</th>
            <th>Order&nbsp;#</th>
            {showDeliveryFee && <th>Del.Fee</th>}
            <th>Tips</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {delivered.map(r => (
            <tr key={r.orderId + r.deliveredAt}>
              <td>{pretty(r.deliveredAt!)}</td>
              <td>{r.orderId}</td>
              {showDeliveryFee && <td>{money(r.totalDeliveryFee)}</td>}
              <td>{money(r.tipAmount)}</td>
              <td>{money(
                (showDeliveryFee ? r.totalDeliveryFee ?? 0 : 0) +
                (r.tipAmount ?? 0),
              )}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className={styles.footerCell}>Totals</th>
            <th></th>
            {showDeliveryFee && (
              <th className={styles.footerCell}>{money(totals.totalDeliveryFee)}</th>
            )}
            <th className={styles.footerCell}>{money(totals.tipAmount)}</th>
            <th className={styles.footerCell}>{money(
              (showDeliveryFee ? totals.totalDeliveryFee ?? 0 : 0) +
              (totals.tipAmount ?? 0),
            )}</th>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PayoutTable({
  caption,
  rows,
  emptyMsg,
}: {
  caption: string;
  rows: Payout[];
  emptyMsg: string;
}) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2>
        {caption} ({rows.length})
      </h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{caption === 'Paid' ? 'Paid&nbsp;At' : 'Created'}</th>
              <th>Order&nbsp;#</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id}>
                <td>{pretty(p.paidAt ?? p.createdAt)}</td>
                <td>{p.order?.orderId ?? '—'}</td>
                <td>{money(p.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.empty}>
                  {emptyMsg}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
