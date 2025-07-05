// File: components/dashboard/OrdersDashboard/SearchAndFilter.tsx

import React from 'react';
import styles from './SearchAndFilter.module.css';
import type { ServerAgg } from './types';

interface SearchAndFilterProps {
  role: 'admin' | 'staff' | 'server' | 'driver' | 'cashier';
  query: string;
  onQueryChange: (q: string) => void;
  serverFilter: string;
  onServerFilterChange: (s: string) => void;
  serverAgg: ServerAgg[];
}

export default function SearchAndFilter({
  role,
  query,
  onQueryChange,
  serverFilter,
  onServerFilterChange,
  serverAgg,
}: SearchAndFilterProps) {
  return (
    <div className={styles.container}>
      {(role === 'admin' || role === 'staff') && (
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search Order ID or Name…"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
      )}

      {role === 'cashier' && (
        <label className={styles.filterLabel}>
          Server:
          <select
            className={styles.filterSelect}
            value={serverFilter}
            onChange={e => onServerFilterChange(e.target.value)}
          >
            <option value="">All servers</option>
            {serverAgg.map(s => (
              <option key={s.server.id} value={String(s.server.id)}>
                {s.server.firstName} {s.server.lastName} ({s.pendingOrders})
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
