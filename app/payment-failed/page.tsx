// File: app/payment-failed/page.tsx
"use client";

import { useSearchParams } from "next/navigation";

export default function PaymentFailed() {
  const params = useSearchParams();
  const orderId = params.get("id") || "";

  return (
    <div>
      <h1>Payment Failed</h1>
      <p>Sorry, your payment for order <strong>{orderId}</strong> failed.</p>
      <p>
        <a href="/cart">Return to Cart</a> to try again, or contact support.
      </p>
    </div>
  );
}
