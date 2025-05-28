// File: hooks/useOrder.ts
/**
 * Hook to fetch a single order by ID and manage its loading/error state.
 *  • Performs GET /api/orders/:id when `orderId` is provided.
 *  • Stores the fetched order in state.
 *  • Tracks loading and error conditions.
 */

import { useState, useEffect } from "react";

export interface OrderData {
  id: string;
  orderId: string;
  status: string;
  // add other fields returned by GET /api/orders/:id as needed
}

export function useOrder(orderId?: string | null) {
  // Holds the current order data or null if not yet loaded
  const [order, setOrder] = useState<OrderData | null>(null);
  // Tracks whether the fetch is in progress
  const [loading, setLoading] = useState<boolean>(false);
  // Captures any error thrown during fetch
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Do nothing when there is no orderId
    if (!orderId) return;

    setLoading(true);
    setError(null);

    // Fetch the order from the API
    fetch(`/api/orders/${orderId}`)
      .then((res) => {
        if (!res.ok) {
          // Throw to be caught below if status is not 2xx
          throw new Error(`Failed to fetch order: ${res.status}`);
        }
        return res.json();
      })
      .then((data: OrderData) => {
        // Store the retrieved order
        setOrder(data);
      })
      .catch((err: Error) => {
        // Capture any network or parsing errors
        setError(err);
      })
      .finally(() => {
        // Always turn off loading when done
        setLoading(false);
      });
  }, [orderId]);

  return { order, loading, error };
}
