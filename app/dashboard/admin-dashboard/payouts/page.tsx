// File: app/dashboard/admin-dashboard/payouts/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { toast } from "react-toastify";
import styles from "./Payouts.module.css";

interface Payout {
  id: number;
  amount: string;
  user: { id: number; firstName: string; lastName: string };
  order?: { orderId: string };
  paidAt?: string;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPayoutsPage() {
  // Date-range state
  const [from, setFrom] = useState<string>("");
  const [to, setTo]     = useState<string>("");

  // Free-text filter state
  const [filter, setFilter] = useState<string>("");

  // Build SWR keys
  const unpaidKey = `/api/payouts?paid=false${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;
  const paidKey   = `/api/payouts?paid=true${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;

  // Fetch data
  const { data: unpaidData, mutate: mutateUnpaid } = useSWR<Payout[]>(unpaidKey, fetcher);
  const { data: paidData,   mutate: mutatePaid   } = useSWR<Payout[]>(paidKey,   fetcher);

  // Local copies for filtering & selection
  const [unpaid,    setUnpaid]   = useState<Payout[]>([]);
  const [paid,      setPaid]     = useState<Payout[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Sync SWR → state
  useEffect(() => { if (unpaidData) setUnpaid(unpaidData); }, [unpaidData]);
  useEffect(() => { if (paidData)   setPaid(paidData);     }, [paidData]);

  // Selection logic
  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const allUnpaidIds = unpaid.map(p => p.id);
  const allSelected  = allUnpaidIds.length > 0 && allUnpaidIds.every(id => selected.has(id));
  const toggleAll    = () => setSelected(_ => allSelected ? new Set() : new Set(allUnpaidIds));

  // Mark single paid
  const markPaid = async (p: Payout) => {
    setUnpaid(u => u.filter(x => x.id !== p.id));
    const res = await fetch(`/api/payouts/${p.id}`, { method: "PATCH" });
    const updated: Payout = await res.json();
    setPaid(q => [updated, ...q]);
    await Promise.all([mutateUnpaid(), mutatePaid()]);
    toast.success(`Paid $${Number(updated.amount).toFixed(2)} to ${updated.user.firstName}`);
  };

  // Bulk mark selected
  const markSelected = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setUnpaid(u => u.filter(p => !selected.has(p.id)));
    setSelected(new Set());
    await fetch("/api/payouts/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    await Promise.all([mutateUnpaid(), mutatePaid()]);
    toast.success(`Marked ${ids.length} payouts paid`);
  };

  // Bulk “mark all filtered” 
  const markAllFiltered = async () => {
    const ids = filteredUnpaid.map(p => p.id);
    if (!ids.length) return;
    setUnpaid(u => u.filter(p => !ids.includes(p.id)));
    setSelected(new Set());
    await fetch("/api/payouts/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    await Promise.all([mutateUnpaid(), mutatePaid()]);
    toast.success(`Marked ${ids.length} payouts paid`);
  };

  // Delete all paid in range
  const deleteAllPaid = async () => {
    if (!window.confirm("Delete all paid payouts in this range?")) return;
    await fetch(`/api/payouts/paid?${from ? `from=${from}&` : ""}${to ? `to=${to}` : ""}`, {
      method: "DELETE",
    });
    await mutatePaid();
    toast.success("Deleted all paid payouts");
  };

  // CSV export
  const exportCSV = () => {
    const head = "ID,User,Order,Amount,Paid,Created,PaidAt";
    const rows = [
      ...filteredUnpaid.map(p => [
        p.id,
        `${p.user.firstName} ${p.user.lastName}`,
        p.order?.orderId || "",
        p.amount,
        "false",
        p.createdAt,
        ""
      ].join(",")),
      ...filteredPaid.map(p => [
        p.id,
        `${p.user.firstName} ${p.user.lastName}`,
        p.order?.orderId || "",
        p.amount,
        "true",
        p.createdAt,
        p.paidAt || ""
      ].join(","))
    ];
    const csv  = [head, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `payouts_${from || "start"}_${to || "end"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF download
  const downloadPDF = () => {
    window.open(`/api/payouts/pdf?${from ? `from=${from}&` : ""}${to ? `to=${to}` : ""}`, "_blank");
  };

  // Filter logic
  const f = filter.trim().toLowerCase();
  const filteredUnpaid = unpaid.filter(p => {
    const name = `${p.user.firstName} ${p.user.lastName}`.toLowerCase();
    const oid  = (p.order?.orderId || "").toLowerCase();
    const uid  = p.user.id.toString();
    return uid.includes(f) || name.includes(f) || oid.includes(f);
  });
  const filteredPaid = paid.filter(p => {
    const name = `${p.user.firstName} ${p.user.lastName}`.toLowerCase();
    const oid  = (p.order?.orderId || "").toLowerCase();
    const uid  = p.user.id.toString();
    return uid.includes(f) || name.includes(f) || oid.includes(f);
  });

  // Totals
  const totalUnpaid = filteredUnpaid.reduce((s, p) => s + Number(p.amount), 0);
  const totalPaid   = filteredPaid.reduce((s, p)   => s + Number(p.amount), 0);

  if (!unpaidData || !paidData) {
    return <p className={styles.container}>Loading payouts…</p>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {/* date filters */}
        <label>
          From&nbsp;
          <input
            type="date"
            className={styles.searchInput}
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </label>
        <label>
          To&nbsp;
          <input
            type="date"
            className={styles.searchInput}
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </label>
        <button className={styles.button} onClick={() => { mutateUnpaid(); mutatePaid(); }}>
          Apply
        </button>

        {/* free-text filter */}
        <input
          type="text"
          placeholder="Search by user, ID, or order…"
          className={styles.searchInput}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />

        {/* exports */}
        <button className={styles.button} onClick={exportCSV}>
          Download CSV
        </button>
        <button className={styles.button} onClick={downloadPDF}>
          Download PDF
        </button>
        <button className={styles.button} onClick={() => window.print()}>
          Print Statement
        </button>

        {/* bulk */}
        {selected.size > 0 && (
          <button className={styles.button} onClick={markSelected}>
            Mark Selected ({selected.size}) Paid
          </button>
        )}
        {filteredUnpaid.length > 0 && (
          <button className={styles.button} onClick={markAllFiltered}>
            Mark All Filtered ({filteredUnpaid.length}) Paid
          </button>
        )}
        {filteredPaid.length > 0 && (
          <button className={styles.button} onClick={deleteAllPaid}>
            Delete All Paid
          </button>
        )}
      </div>

      <section className={styles.section}>
        <h2>Unpaid ({filteredUnpaid.length})</h2>
        <p className={styles.total}>Total Unpaid: ${totalUnpaid.toFixed(2)}</p>
        {filteredUnpaid.length === 0 ? (
          <p>All done! 🎉</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th>User (ID / Name)</th>
                <th>Amount</th>
                <th>Order #</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredUnpaid.map(p => {
                const sel = selected.has(p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => toggle(p.id)}
                      />
                    </td>
                    <td>{p.user.id} — {p.user.firstName} {p.user.lastName}</td>
                    <td>${Number(p.amount).toFixed(2)}</td>
                    <td>{p.order?.orderId || "—"}</td>
                    <td>
                      <button className={styles.button} onClick={() => markPaid(p)}>
                        Mark Paid
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section}>
        <h2>Paid ({filteredPaid.length})</h2>
        <p className={styles.total}>Total Paid: ${totalPaid.toFixed(2)}</p>
        {filteredPaid.length === 0 ? (
          <p>No history yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User (ID / Name)</th>
                <th>Amount</th>
                <th>Order #</th>
                <th>Paid At</th>
              </tr>
            </thead>
            <tbody>
              {filteredPaid.map(p => (
                <tr key={p.id}>
                  <td>{p.user.id} — {p.user.firstName} {p.user.lastName}</td>
                  <td>${Number(p.amount).toFixed(2)}</td>
                  <td>{p.order?.orderId || "—"}</td>
                  <td>
                    {p.paidAt
                      ? new Date(p.paidAt).toLocaleDateString("en-US", { timeZone: "America/New_York" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
