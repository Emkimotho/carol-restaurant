// File: app/clover/tenders/page.tsx

// Force dynamic rendering because we use a non-caching fetch (revalidate: 0)
export const dynamic = "force-dynamic";

import React from "react";
import CloverTenders, { CloverTender } from "@/components/CloverTenders";

async function getTenders(): Promise<CloverTender[]> {
  const CLOVER_ACCESS_TOKEN = process.env.CLOVER_ACCESS_TOKEN;
  const MERCHANT_ID = process.env.MERCHANT_ID;

  if (!CLOVER_ACCESS_TOKEN || !MERCHANT_ID) {
    console.error("Missing Clover credentials in .env");
    return [];
  }

  try {
    const res = await fetch(
      `https://sandbox.dev.clover.com/v3/merchants/${MERCHANT_ID}/tenders`,
      {
        headers: {
          Authorization: `Bearer ${CLOVER_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        // Use revalidate: 0 to force fresh data on every request.
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Error fetching tenders:", text);
      return [];
    }

    const data = await res.json();
    return data.elements || [];
  } catch (error) {
    console.error("Error in getTenders:", error);
    return [];
  }
}

const TendersPage = async () => {
  const tenders = await getTenders();

  return (
    <div style={{ padding: "2rem" }}>
      <CloverTenders tenders={tenders} />
    </div>
  );
};

export default TendersPage;
