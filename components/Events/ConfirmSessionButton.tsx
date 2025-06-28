"use client";

import { useState } from "react";
import { toast } from "react-toastify";

interface ConfirmSessionButtonProps {
  bookingId: string;
}

export default function ConfirmSessionButton({ bookingId }: ConfirmSessionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/create-session`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to create payment session");
      } else if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        toast.error("No session URL returned");
      }
    } catch (err: any) {
      console.error("Error creating session:", err);
      toast.error("Server error creating payment session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleConfirm}
      disabled={loading}
      className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
    >
      {loading ? "Redirecting..." : "Confirm & Pay"}
    </button>
  );
}
