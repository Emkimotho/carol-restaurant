// File: hooks/useCreateOrder.ts

import { useState } from "react";
import type { DeliveryAddress } from "@/contexts/OrderContext";

/* ------------------------------------------------------------------ */
/* 1. Types                                                            */
/* ------------------------------------------------------------------ */

/** Shape expected by the /api/orders POST route */
export interface CreateOrderPayload {
  /* -------- cart + workflow -------- */
  items: any[];
  totalAmount: number;
  orderType: string;
  schedule: string | null;

  /* ---- alcohol tracking ---- */
  containsAlcohol: boolean;
  ageVerified: boolean;

  /* -------- tip fields ------------ */
  tip?: string;
  customTip?: string;

  /* -------- numeric breakdown ----- */
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  customerDeliveryFee: number;
  restaurantDeliveryFee: number;
  totalDeliveryFee: number;

  deliveryDistanceMiles: number;
  deliveryTimeMinutes: number;
  driverPayout: number;

  /* -------- customer | guest ------ */
  customerId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;

  /* -------- nested --------------- */
  deliveryAddress?: DeliveryAddress | null;

  /* ------ explicit delivery instructions ------ */
  deliveryInstructions?: string | null;
}

/** What the server echoes back on success */
export interface CreateOrderResult {
  id: string;      // DB UUID
  orderId: string; // friendly “ORD-yyyymmdd-XXXX”
}

/* ------------------------------------------------------------------ */
/* 2. Hook                                                             */
/* ------------------------------------------------------------------ */

export function useCreateOrder() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<Error | null>(null);

  /**
   * POST `payload` to /api/orders and return { id, orderId }.
   */
  async function createOrder(
    payload: CreateOrderPayload
  ): Promise<CreateOrderResult> {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      return (await res.json()) as CreateOrderResult;
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  /* exposed API */
  return { createOrder, loading, error };
}
