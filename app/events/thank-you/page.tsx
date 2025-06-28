// File: app/events/thank-you/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ThankYouContent from "@/components/Events/ThankYouContent";

export default function EventThankYouPage() {
  const searchParams = useSearchParams();
  // Grab bookingId from query string
  const bookingIdParam = searchParams?.get("bookingId");
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    // When searchParams updates, set bookingId state
    if (bookingIdParam) {
      setBookingId(bookingIdParam);
    } else {
      setBookingId(null);
    }
  }, [bookingIdParam]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-4">Thank You!</h1>

      {!bookingId ? (
        <p className="text-lg text-gray-700">
          No booking ID provided. If you arrived here unexpectedly, please check your email confirmation link or contact support.
        </p>
      ) : (
        // Pass bookingId to the content component which will fetch/display booking & ticket info
        <ThankYouContent bookingId={bookingId} />
      )}
    </div>
  );
}
