/* =======================================================================
 * File: components/dashboard/AdminDashboard/CashAudit/CashAuditTable.tsx
 * -----------------------------------------------------------------------
 * Admin Cash‑Audit view:
 *   – Lists every cash‑collection record
 *   – Filters by status / server / cashier
 *   – Inline settle / unsettle / delete actions
 *   – Clickable Order # opens existing DetailModal
 * ---------------------------------------------------------------------*/

'use client';

import React, { useState }   from 'react';
import useSWR                from 'swr';
import { toast }             from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles                from './CashAuditTable.module.css';
import DetailModal           from '../../OrdersDashboard/DetailModal';
import type { Order }        from '../../OrdersDashboard/OrdersDashboard';

/* ------------------------------------------------------------------ */
/*                              Types                                 */
/* ------------------------------------------------------------------ */
interface CashCollectionRow {
  id:           string;
  orderId:      string;
  amount:       number;
  status:       'PENDING' | 'SETTLED';
  collectedAt:  string;
  settledAt?:   string | null;
  server:       { id: number; firstName: string; lastName: string };
  settledBy?:   { id: number; firstName: string; lastName: string } | null;
  order:        { orderId: string; totalAmount: number; paymentMethod: string };
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => r.json());

export default function CashAuditTable() {
  /* ---------------- state ----------------- */
  const [statusFilter, setStatusFilter] = useState<'ALL'|'PENDING'|'SETTLED'>('ALL');
  const [serverFilter, setServerFilter] = useState<number|''>('');
  const [cashierFilter,setCashierFilter]= useState<number|''>('');
  const [detail, setDetail]             = useState<Order|null>(null);

  /* ---------------- SWR ------------------- */
  const queryParts: string[] = ['role=admin'];
  if (statusFilter !== 'ALL') queryParts.push(`status=${statusFilter}`);
  if (serverFilter)          queryParts.push(`serverId=${serverFilter}`);
  if (cashierFilter)         queryParts.push(`settledById=${cashierFilter}`);

  const url = `/api/orders/cash-collections?${queryParts.join('&')}`;
  const { data: rows = [], mutate } =
    useSWR<CashCollectionRow[]>(url, fetcher, { refreshInterval: 10000 });

  /* Build dropdown option sets */
  const uniqServers  = Array.from(new Map(rows.map(r => [r.server.id, r.server])).values());
  const uniqCashiers = Array.from(new Map(
    rows.filter(r => r.settledBy).map(r => [r.settledBy!.id, r.settledBy!])
  ).values());

  /* ---------------- helpers ---------------- */
  const patchRow = async (id: string, body: any, msg: string) => {
    const t = toast.loading(msg);
    try {
      const res = await fetch(`/api/orders/cash-collections/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      toast.update(t, { render: 'Saved', type: 'success', isLoading: false, autoClose: 1200 });
    } catch (err: any) {
      toast.update(t, { render: err.message, type: 'error', isLoading: false });
    }
  };

  const deleteRow = async (id: string) => {
    if (!confirm('Delete this record permanently?')) return;
    const t = toast.loading('Deleting…');
    try {
      const res = await fetch(`/api/orders/cash-collections/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mutate();
      toast.update(t, { render: 'Deleted', type: 'success', isLoading: false, autoClose: 1200 });
    } catch (err: any) {
      toast.update(t, { render: err.message, type: 'error', isLoading: false });
    }
  };

  /* ---------------- render ----------------- */
  return (
    <>
      <h1 className={styles.header}>Cash Audit</h1>

      {/* ---------- Filters ---------- */}
      <div className={styles.filterRow}>
        <label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className={styles.filterSelect}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SETTLED">Settled</option>
          </select>
        </label>

        <label>
          <select
            value={serverFilter}
            onChange={e => setServerFilter(e.target.value ? Number(e.target.value) : '')}
            className={styles.filterSelect}
          >
            <option value="">All Servers</option>
            {uniqServers.map(s => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </label>

        <label>
          <select
            value={cashierFilter}
            onChange={e => setCashierFilter(e.target.value ? Number(e.target.value) : '')}
            className={styles.filterSelect}
          >
            <option value="">All Cashiers</option>
            {uniqCashiers.map(c => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ---------- Table ---------- */}
      <div className={styles.tableWrapper}>
        <table className={styles.auditTable}>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Server</th>
              <th>Cashier</th>
              <th>Amount</th>
              <th>Collected At</th>
              <th>Settled At</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>
                  <button
                    className={styles.orderLink}
                    onClick={async () => {
                      const o = await fetch(`/api/orders/${r.orderId}`).then(res => res.json());
                      setDetail(o);
                    }}
                  >
                    {r.order.orderId}
                  </button>
                </td>
                <td>{r.server.firstName} {r.server.lastName}</td>
                <td>{r.settledBy ? `${r.settledBy.firstName} ${r.settledBy.lastName}` : '—'}</td>
                <td>${r.amount.toFixed(2)}</td>
                <td>{new Date(r.collectedAt).toLocaleString()}</td>
                <td>{r.settledAt ? new Date(r.settledAt).toLocaleString() : '—'}</td>
                <td>
                  <span
                    className={`${styles.badge} ${
                      r.status === 'PENDING' ? styles.badgePending : styles.badgeSettled
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {r.status === 'PENDING' ? (
                    <button
                      className={styles.actionBtn}
                      onClick={() => patchRow(r.id, { status: 'SETTLED' }, 'Settling…')}
                    >
                      Settle
                    </button>
                  ) : (
                    <button
                      className={styles.actionBtn}
                      onClick={() =>
                        patchRow(
                          r.id,
                          { status: 'PENDING', settledById: null },
                          'Unsettling…'
                        )
                      }
                    >
                      Unsettle
                    </button>
                  )}
                  <button className={styles.deleteBtn} onClick={() => deleteRow(r.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Detail Modal ---------- */}
      <DetailModal
        isOpen={!!detail}
        order={detail as any}
        role="admin"
        onClose={() => setDetail(null)}
      />
    </>
  );
}
