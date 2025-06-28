// File: components/dashboard/OrdersDashboard/hooks/useCashCollections.ts
import useSWR from 'swr';
import type { CashCollectionRecord } from '../types';
import { fetcher } from '../utils';

export function useCashCollections({
  serverId,
  status,
}: {
  serverId?: string | number;
  status: 'PENDING' | 'SETTLED';
}) {
  const key =
    serverId != null
      ? `/api/orders/cash-collections?serverId=${serverId}&status=${status}`
      : null;
  const { data, error } = useSWR<CashCollectionRecord[]>(key, fetcher, {
    refreshInterval: 10_000,
  });
  return {
    records: data ?? [],
    isLoading: !error && !data,
  };
}
