/**
 * Hook to fetch a single order by ID and manage its loading/error state.
 *  • Performs GET /api/orders/:id when `orderId` is provided.
 *  • Stores the fetched order in state.
 *  • Tracks loading and error conditions.
 *  • Polls every 5 seconds for updates.
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

    let isActive = true;
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`);
        if (!res.ok) throw new Error(`Failed to fetch order: ${res.status}`);
        const data: { order: OrderData } = await res.json();
        if (isActive) setOrder(data.order);
      } catch (err: any) {
        if (isActive) setError(err);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    // initial fetch
    fetchOrder();

    // poll every 5 seconds
    const intervalId = setInterval(fetchOrder, 5000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [orderId]);

  return { order, loading, error };
}
