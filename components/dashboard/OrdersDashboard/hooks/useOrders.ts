// File: components/dashboard/OrdersDashboard/hooks/useOrders.ts
import useSWR from 'swr';
import type { OrdersListResponse } from '../types';
import { fetcher } from '../utils';

export function useOrders({
  role,
  userId,
  page,
  limit,
  query,
  serverFilter,
  reconciledFlag,
}: {
  role:
    | 'admin'
    | 'staff'
    | 'server'      // restaurant server
    | 'staffMine'
    | 'driver'
    | 'driverMine'
    | 'cashier';
  userId?:         string | number;
  page:            number;
  limit:           number;
  query:           string;
  serverFilter:    string;
  reconciledFlag?: boolean;
}) {
  /* -------------------------------------------------- */
  /* Build base URL                                     */
  /* -------------------------------------------------- */
  let key = `/api/orders?page=${page}&limit=${limit}`;

  /* — Admin / staff: free-text search — */
  if ((role === 'admin' || role === 'staff') && query.trim()) {
    key += `&q=${encodeURIComponent(query)}`;
  }

  /* — Staff “my orders” (legacy) — */
  if (role === 'staffMine' && userId) {
    key += `&staffId=${userId}`;
  }

  /* — Restaurant server — ❶  (no role=server flag) */
  if (role === 'server' && userId) {
    key += `&serverId=${userId}`;
    if (query.trim()) key += `&q=${encodeURIComponent(query)}`;
  }

  /* — Driver queues — */
  if (role === 'driver' && userId) {
    // my loads + unclaimed
    key += `&role=driver&driverId=${userId}`;
  } else if (role === 'driverMine' && userId) {
    // only my loads
    key += `&driverId=${userId}`;
  }

  /* — Cashier reconciliation — */
  if (role === 'cashier') {
    key += `&role=cashier&reconciled=${reconciledFlag ? 'true' : 'false'}`;
    if (serverFilter) key += `&serverId=${serverFilter}`;
  }

  /* -------------------------------------------------- */
  /* Fetch                                               */
  /* -------------------------------------------------- */
  const { data, error, mutate } = useSWR<OrdersListResponse>(key, fetcher, {
    refreshInterval: 5_000,
  });

  return {
    orders:     data?.orders     ?? [],
    page:       data?.page       ?? 1,
    totalPages: data?.totalPages ?? 1,
    isLoading:  !error && !data,
    mutate,
  };
}
