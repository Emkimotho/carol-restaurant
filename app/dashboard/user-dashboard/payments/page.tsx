// File: app/dashboard/user-dashboard/payments/page.tsx
"use client";

import React from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";

interface Payout {
  id: number;
  amount: string;
  category: string;
  paid: boolean;
  paidAt?: string;
  order?: { orderId: string };
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MyPayoutsPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id as number | undefined;

  // Only fetch once we know the user ID
  const { data: payouts, error } = useSWR<Payout[]>(
    () => (status === "authenticated" && userId ? `/api/payouts?userId=${userId}` : null),
    fetcher
  );

  if (status === "loading") {
    return <p>Loading session…</p>;
  }
  if (error) {
    return <p>Error loading payouts.</p>;
  }
  if (!payouts) {
    return <p>Loading your payouts…</p>;
  }

  const unpaid = payouts.filter((p) => !p.paid);
  const paid   = payouts.filter((p) => p.paid);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York" });

  const humanize = (cat: string) =>
    cat.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div style={{ padding: "1rem" }}>
      <h1>My Payouts</h1>

      <section style={{ marginTop: "2rem" }}>
        <h2>Unpaid</h2>
        {unpaid.length === 0 ? (
          <p>🎉 You have no unpaid payouts!</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Amount</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Type</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Order #</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: "0.5rem 0" }}>${p.amount}</td>
                  <td style={{ padding: "0.5rem 0" }}>{humanize(p.category)}</td>
                  <td style={{ padding: "0.5rem 0" }}>{p.order?.orderId || "—"}</td>
                  <td style={{ padding: "0.5rem 0" }}>{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Paid</h2>
        {paid.length === 0 ? (
          <p>No payouts have been marked as paid yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Amount</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Type</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Order #</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>Paid On</th>
              </tr>
            </thead>
            <tbody>
              {paid.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: "0.5rem 0" }}>${p.amount}</td>
                  <td style={{ padding: "0.5rem 0" }}>{humanize(p.category)}</td>
                  <td style={{ padding: "0.5rem 0" }}>{p.order?.orderId || "—"}</td>
                  <td style={{ padding: "0.5rem 0" }}>
                    {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-US", {
                      timeZone: "America/New_York",
                    }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
