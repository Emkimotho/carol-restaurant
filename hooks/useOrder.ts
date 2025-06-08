/**
 * Hook to fetch a single order by ID and manage its loading/error state.
 *  • Performs GET /api/orders/:id when `orderId` is provided.
 *  • Stores the fetched order in state.
 *  • Tracks loading and error conditions.
 */

import { useState, useEffect } from "react";

export interface OrderData {
  id:               string;
  orderId:          string;
  status:           string;
  deliveryType:     string;
  holeNumber?:      number | null;
  eventLocationId?: string | null;
  serverName?:      string | null;
  // You can add more fields here as you need them...
}

export function useOrder(orderId?: string | null) {
  const [order, setOrder]     = useState<OrderData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError]     = useState<Error | null>(null);

  useEffect(() => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/orders/${encodeURIComponent(orderId)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch order: ${res.status}`);
        return res.json();
      })
      .then((data: { order: OrderData }) => {
        setOrder(data.order);
      })
      .catch(err => {
        setError(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderId]);

  return { order, loading, error };
}
