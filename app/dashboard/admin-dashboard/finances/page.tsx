/* eslint-disable react-hooks/exhaustive-deps */
// File: app/dashboard/admin-dashboard/finances/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

import styles from "@/components/dashboard/AdminDashboard/finances/Finances.module.css";
import { toast } from "react-toastify";
import PrintLayout from "@/components/PrintLayout";

/* ─── Types & helpers ─── */
type CorePeriod = "day" | "week" | "month" | "year";
type Period = CorePeriod | "custom";

interface Totals {
  subtotal?: number | null;
  taxAmount?: number | null;
  tipAmount?: number | null;
  restaurantDeliveryFee?: number | null;
  customerDeliveryFee?: number | null;
  totalAmount?: number | null;
}

interface Order {
  orderId: string;
  createdAt: string;
  updatedAt: string;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  restaurantDeliveryFee: number;
  customerDeliveryFee: number;
  totalAmount: number;
}

interface Range {
  from: string;
  to: string;
}

const money = (n?: number | null) =>
  (n ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD" });
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const pretty = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
const title: Record<CorePeriod, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Annual",
};

export default function FinancesPage() {
  const [period, setPeriod] = useState<Period>("day");
  const [totals, setTotals] = useState<Totals>({});
  const [rows, setRows] = useState<Order[]>([]);
  const [range, setRange] = useState<Range | null>(null);
  const [fromD, setFrom] = useState("");
  const [toD, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  /* — fetch — */
  const load = async (p: Period, f?: string, t?: string) => {
    setLoading(true);
    const qs = p === "custom" ? `from=${f}&to=${t}` : `period=${p}`;
    try {
      const data = await fetch(
        `/api/admin/finances?${qs}&orders=true`
      ).then((r) => r.json());
      setTotals(data.totals);
      setRows(data.orders);
      setRange(data.range);
    } catch {
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (period !== "custom") load(period);
  }, [period]);

  /* — chart — */
  const chart = useMemo(() => {
    if (!rows.length) return null;
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const key =
        period === "day"
          ? new Date(r.updatedAt)
              .getHours()
              .toString()
              .padStart(2, "0") + ":00"
          : ymd(new Date(r.updatedAt));
      m.set(key, (m.get(key) ?? 0) + r.totalAmount);
    });
    const labels = [...m.keys()].sort();
    return {
      labels,
      datasets: [
        {
          label: "Gross Income ($)",
          data: labels.map((l) => m.get(l)!),
          tension: 0.3,
        },
      ],
    };
  }, [rows, period]);

  /* — CSV — */
  const exportCSV = () => {
    if (!rows.length) {
      toast.warn("No data");
      return;
    }
    const head =
      "Delivered,Order ID,Subtotal,Taxes,Tips,DelFee(Rest.),DelFee(Cust.),Gross";
    const body = rows
      .map((r) =>
        [
          pretty(r.updatedAt),
          r.orderId,
          r.subtotal,
          r.taxAmount,
          r.tipAmount,
          r.restaurantDeliveryFee,
          r.customerDeliveryFee,
          r.totalAmount,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeLabel = range
    ? range.from.slice(0, 10) === range.to.slice(0, 10)
      ? pretty(range.from)
      : `${pretty(range.from)} – ${pretty(range.to)}`
    : "";

  const core: CorePeriod[] = ["day", "week", "month", "year"];

  return (
    <PrintLayout rangeLabel={range ? rangeLabel : undefined}>
      <div className={styles.container}>
        {/* period tabs */}
        <nav className={`${styles.tabs} no-print`}>
          {core.map((p) => (
            <button
              key={p}
              className={`${styles.tab} ${period === p ? styles.active : ""}`}
              onClick={() => setPeriod(p)}
            >
              {title[p]}
            </button>
          ))}
          <button
            className={`${styles.tab} ${
              period === "custom" ? styles.active : ""
            }`}
            onClick={() => setPeriod("custom")}
          >
            Custom
          </button>
        </nav>

        {period === "custom" && (
          <div className={`${styles.rangeBar} no-print`}>
            <label>
              From{" "}
              <input
                type="date"
                value={fromD}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              To{" "}
              <input
                type="date"
                value={toD}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button onClick={() => load("custom", fromD, toD)}>Apply</button>
          </div>
        )}

        {/* KPI cards */}
        <div className={styles.cards}>
          <Card label="Subtotal" val={money(totals.subtotal)} />
          <Card label="Taxes" val={money(totals.taxAmount)} />
          <Card label="Tips" val={money(totals.tipAmount)} />
          <Card
            label="Del.Fee (Rest.)"
            val={money(totals.restaurantDeliveryFee)}
          />
          <Card
            label="Del.Fee (Cust.)"
            val={money(totals.customerDeliveryFee)}
          />
          <Card label="Gross Income" val={money(totals.totalAmount)} />
        </div>

        {chart && (
          <div className={styles.chartWrap}>
            <Line
              data={chart}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          </div>
        )}

        <div className={`${styles.actions} no-print`}>
          <button onClick={exportCSV} disabled={!rows.length}>
            Export CSV
          </button>
          <button onClick={() => window.print()}>Print</button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Delivered</th>
                <th>Order&nbsp;#</th>
                <th>Subtotal</th>
                <th>Taxes</th>
                <th>Tips</th>
                <th>Del.Rest.</th>
                <th>Del.Cust.</th>
                <th>Gross</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.orderId + r.updatedAt}>
                  <td>{pretty(r.updatedAt)}</td>
                  <td>{r.orderId}</td>
                  <td>{money(r.subtotal)}</td>
                  <td>{money(r.taxAmount)}</td>
                  <td>{money(r.tipAmount)}</td>
                  <td>{money(r.restaurantDeliveryFee)}</td>
                  <td>{money(r.customerDeliveryFee)}</td>
                  <td>{money(r.totalAmount)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    No data.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th className={styles.footerCell}>Totals</th>
                <th className={styles.footerCell}></th>
                <th className={styles.footerCell}>
                  {money(totals.subtotal)}
                </th>
                <th className={styles.footerCell}>
                  {money(totals.taxAmount)}
                </th>
                <th className={styles.footerCell}>
                  {money(totals.tipAmount)}
                </th>
                <th className={styles.footerCell}>
                  {money(totals.restaurantDeliveryFee)}
                </th>
                <th className={styles.footerCell}>
                  {money(totals.customerDeliveryFee)}
                </th>
                <th className={styles.footerCell}>
                  {money(totals.totalAmount)}
                </th>
              </tr>
            </tfoot>
          </table>
        </div>

        {loading && <p>Loading…</p>}
      </div>
    </PrintLayout>
  );
}

/* small card */
function Card({ label, val }: { label: string; val: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardVal}>{val}</span>
    </div>
  );
}
