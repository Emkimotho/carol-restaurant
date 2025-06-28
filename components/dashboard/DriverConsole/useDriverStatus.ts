// File: components/dashboard/DriverConsole/useDriverStatus.ts
'use client';

import useSWR from 'swr';
import { useCallback } from 'react';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<{ isOnline: boolean }>;
  });

export function useDriverStatus(driverId: number) {
  const endpoint = `/api/drivers/${driverId}/status`;
  const { data, error, isValidating, mutate } = useSWR(endpoint, fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: true,
  });
  const online = data?.isOnline ?? false;

  const toggleOnline = useCallback(async () => {
    // optimistic UI
    mutate({ isOnline: !online }, { revalidate: false });
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: !online ? 'online' : 'offline' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      mutate(json, { revalidate: false });
      return json.isOnline;
    } catch (err) {
      mutate(); // rollback
      throw err;
    }
  }, [endpoint, online, mutate]);

  return { online, isValidating, error, toggleOnline };
}
