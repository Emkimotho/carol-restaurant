// File: app/payment-cancelled/page.tsx
"use client";

import { useSearchParams } from "next/navigation";

export default function PaymentCancelled() {
  const params = useSearchParams();
  const orderId = params.get("id") || "";

  return (
    <div>
      <h1>Payment Cancelled</h1>
      <p>You cancelled payment for order <strong>{orderId}</strong>.</p>
      <p>
        <a href="/cart">Return to Cart</a> if you’d like to try again.
      </p>
    </div>
  );
}
