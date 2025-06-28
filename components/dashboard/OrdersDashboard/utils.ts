// File: components/dashboard/OrdersDashboard/utils.ts

import { useEffect, useState } from 'react';

/**
 * Simple fetcher for use with SWR.
 */
export const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(res => res.json());

/**
 * Debounces a value by the given delay (ms).
 * Usage: const debouncedValue = useDebounce(value, 300);
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
