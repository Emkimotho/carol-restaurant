/* eslint-disable react-hooks/exhaustive-deps */
// File: app/dashboard/admin-dashboard/finances/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

import styles from "@/components/dashboard/AdminDashboard/finances/Finances.module.css";
import { toast } from "react-toastify";
import PrintLayout from "@/components/PrintLayout";
import CalculationInfoModal from "@/components/dashboard/AdminDashboard/CalculationInfoModal";

/* ─── Types & helpers ─── */
type CorePeriod = "day" | "week" | "month" | "year";
type Period = CorePeriod | "custom";

interface Totals {
  subtotal?: number | null;
  taxAmount?: number | null;
  tipAmount?: number | null;
  customerDeliveryFee?: number | null;
  restaurantDeliveryFee?: number | null;
  driverPayout?: number | null;
  serverPayout?: number | null;
}

interface OrderRow {
  orderId: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt: string;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  customerDeliveryFee: number;
  restaurantDeliveryFee: number;
  deliveryType?: string; // optional, if needed
  driverPayout: number;
  serverPayout: number;
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
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [range, setRange] = useState<Range | null>(null);
  const [fromD, setFrom] = useState("");
  const [toD, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  /* — fetch data from API — */
  const load = async (p: Period, f?: string, t?: string) => {
    setLoading(true);
    const qs = p === "custom" ? `from=${f}&to=${t}` : `period=${p}`;
    try {
      const res = await fetch(`/api/admin/finances?${qs}&orders=true`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load finances");
      } else {
        // Expect data.totals: { subtotal, taxAmount, tipAmount, customerDeliveryFee, restaurantDeliveryFee, driverPayout, serverPayout }
        setTotals(data.totals ?? {});
        // Expect data.orders: array of objects containing at least { orderId, createdAt, updatedAt, deliveredAt, subtotal, taxAmount, tipAmount, customerDeliveryFee, restaurantDeliveryFee, driverPayout, serverPayout }
        const incoming: any[] = data.orders ?? [];
        const mapped: OrderRow[] = incoming.map((r) => ({
          orderId: r.orderId,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          deliveredAt: r.deliveredAt ?? r.updatedAt,
          subtotal: r.subtotal ?? 0,
          taxAmount: r.taxAmount ?? 0,
          tipAmount: r.tipAmount ?? 0,
          customerDeliveryFee: r.customerDeliveryFee ?? 0,
          restaurantDeliveryFee: r.restaurantDeliveryFee ?? 0,
          // optional: r.deliveryType,
          driverPayout: r.driverPayout ?? 0,
          serverPayout: r.serverPayout ?? 0,
        }));
        setRows(mapped);
        setRange(data.range ?? null);
      }
    } catch (e) {
      console.error("Fetch error", e);
      toast.error("Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== "custom") {
      load(period);
    }
  }, [period]);

  /* — Chart: bar chart of Driver vs Server Payout over time — */
  const chartData = useMemo(() => {
    if (!rows.length) return null;
    const mDriver = new Map<string, number>();
    const mServer = new Map<string, number>();
    rows.forEach((r) => {
      const dateObj = new Date(r.updatedAt);
      let key: string;
      if (period === "day") {
        key = dateObj.getHours().toString().padStart(2, "0") + ":00";
      } else {
        key = ymd(dateObj);
      }
      mDriver.set(key, (mDriver.get(key) ?? 0) + (r.driverPayout ?? 0));
      mServer.set(key, (mServer.get(key) ?? 0) + (r.serverPayout ?? 0));
    });
    // union of keys
    const labels = Array.from(new Set([...mDriver.keys(), ...mServer.keys()])).sort();
    return {
      labels,
      datasets: [
        {
          label: "Driver Payout",
          data: labels.map((l) => mDriver.get(l) ?? 0),
          backgroundColor: "rgba(75, 192, 192, 0.7)",
        },
        {
          label: "Server Payout",
          data: labels.map((l) => mServer.get(l) ?? 0),
          backgroundColor: "rgba(153, 102, 255, 0.7)",
        },
      ],
    };
  }, [rows, period]);

  const chartOptions = useMemo<ChartOptions<"bar">>(() => {
    return {
      responsive: true,
      plugins: {
        legend: { display: true, position: "top" },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || "";
              const val = context.parsed.y ?? 0;
              return `${label}: ${val.toLocaleString(undefined, {
                style: "currency",
                currency: "USD",
              })}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "category",
          ticks: {
            // cast to any to satisfy TS
            ...( { autoSkip: true, maxRotation: 0 } as any ),
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            ...( { autoSkip: true } as any ),
          },
        },
      },
    };
  }, [period]);

  /* — CSV export — */
  const exportCSV = () => {
    if (!rows.length) {
      toast.warn("No data");
      return;
    }
    const head =
      "Delivered,Order ID,Subtotal,Taxes,Tip Amount,CustDelFee,RestSubsidy,DriverPayout,ServerPayout";
    const body = rows
      .map((r) =>
        [
          pretty(r.updatedAt),
          r.orderId,
          r.subtotal,
          r.taxAmount,
          r.tipAmount,
          r.customerDeliveryFee,
          r.restaurantDeliveryFee,
          r.driverPayout,
          r.serverPayout,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finances-${period}.csv`;
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
        {/* Top bar: title + info icon */}
        <div className={styles.topBar}>
          <h1 className={styles.header}>Finances</h1>
          <CalculationInfoModal />
        </div>

        {/* Period tabs */}
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
            className={`${styles.tab} ${period === "custom" ? styles.active : ""}`}
            onClick={() => setPeriod("custom")}
          >
            Custom
          </button>
        </nav>

        {/* Custom date range inputs */}
        {period === "custom" && (
          <div className={`${styles.rangeBar} no-print`}>
            <label>
              From{" "}
              <input type="date" value={fromD} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              To{" "}
              <input type="date" value={toD} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button onClick={() => load("custom", fromD, toD)}>Apply</button>
          </div>
        )}

        {/* KPI cards */}
        <div className={styles.cards}>
          <Card label="Subtotal" val={money(totals.subtotal)} />
          <Card label="Taxes" val={money(totals.taxAmount)} />
          <Card label="Tip Amount" val={money(totals.tipAmount)} />
          <Card label="Cust. Delivery Fee" val={money(totals.customerDeliveryFee)} />
          <Card label="Rest. Delivery Subsidy" val={money(totals.restaurantDeliveryFee)} />
          <Card label="Driver Payout" val={money(totals.driverPayout)} />
          <Card label="Server Payout" val={money(totals.serverPayout)} />
        </div>

        {/* Bar Chart */}
        {chartData && (
          <div className={styles.chartWrap}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        )}

        {/* Actions */}
        <div className={`${styles.actions} no-print`}>
          <button onClick={exportCSV} disabled={!rows.length}>
            Export CSV
          </button>
          <button onClick={() => window.print()}>Print</button>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Delivered</th>
                <th>Order&nbsp;#</th>
                <th>Subtotal</th>
                <th>Taxes</th>
                <th>Tip Amount</th>
                <th>Cust Del.Fee</th>
                <th>Rest Subsidy</th>
                <th>Driver Payout</th>
                <th>Server Payout</th>
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
                  <td>{money(r.customerDeliveryFee)}</td>
                  <td>{money(r.restaurantDeliveryFee)}</td>
                  <td>{money(r.driverPayout)}</td>
                  <td>{money(r.serverPayout)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={9} className={styles.empty}>
                    No data.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <th className={styles.footerCell}>Totals</th>
                  <th className={styles.footerCell}></th>
                  <th className={styles.footerCell}>{money(totals.subtotal)}</th>
                  <th className={styles.footerCell}>{money(totals.taxAmount)}</th>
                  <th className={styles.footerCell}>{money(totals.tipAmount)}</th>
                  <th className={styles.footerCell}>{money(totals.customerDeliveryFee)}</th>
                  <th className={styles.footerCell}>{money(totals.restaurantDeliveryFee)}</th>
                  <th className={styles.footerCell}>{money(totals.driverPayout)}</th>
                  <th className={styles.footerCell}>{money(totals.serverPayout)}</th>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {loading && <p>Loading…</p>}
      </div>
    </PrintLayout>
  );
}

/* small card component */
function Card({ label, val }: { label: string; val: string }) {
  return (
    <div className={styles.card}>
      <span className={styles.cardLabel}>{label}</span>
      <span className={styles.cardVal}>{val}</span>
    </div>
  );
}
