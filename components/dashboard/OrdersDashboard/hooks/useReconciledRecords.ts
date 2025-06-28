// File: components/dashboard/OrdersDashboard/hooks/useReconciledRecords.ts
import useSWR from 'swr';
import type { CashCollectionRecord } from '../types';
import { fetcher } from '../utils';

export function useReconciledRecords({
  cashierId,
}: {
  cashierId?: string | number;
}) {
  const key =
    cashierId != null
      ? `/api/orders/cash-collections?cashierId=${cashierId}&status=SETTLED`
      : null;
  const { data, error } = useSWR<CashCollectionRecord[]>(key, fetcher, {
    refreshInterval: 10_000,
  });
  return {
    records: data ?? [],
    isLoading: !error && !data,
  };
}
