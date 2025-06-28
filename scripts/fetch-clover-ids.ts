#!/usr/bin/env tsx
// File: scripts/fetch-clover-ids.ts

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { cloverFetch, getCloverConfig } from "../lib/cloverClient";

// 1️⃣ Load your .env.local so getCloverConfig() can read your API keys:
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const { merchantId } = getCloverConfig();

  // 2️⃣ Fetch all tenders
  const tendersData = await cloverFetch(
    `/v3/merchants/${merchantId}/tenders`
  ) as { elements: Array<{ id: string; type?: string; label?: string }> };

  // 3️⃣ Pick the credit‐card tender
  const creditTender = tendersData.elements.find(
    (t) =>
      t.type === "CREDIT" ||
      (t.label || "").toLowerCase().includes("credit")
  );
  if (!creditTender) {
    throw new Error("No CREDIT tender found in Clover response");
  }

  // 4️⃣ Fetch all tax rates
  const taxData = await cloverFetch(
    `/v3/merchants/${merchantId}/tax_rates`
  ) as { elements: Array<{ id: string; name?: string; rate?: number }> };

  // 5️⃣ Try to match your default rate by name or env var
  let defaultTax = taxData.elements.find(
    (r) =>
      (r.name || "").toLowerCase().includes("sales") ||
      r.rate === parseFloat(process.env.CLOVER_DEFAULT_TAX_RATE || "")
  );

  // 6️⃣ Fallback: if none matched, just use the first one (but warn)
  if (!defaultTax) {
    console.warn(
      `⚠️  No tax rate matched by name or CLOVER_DEFAULT_TAX_RATE. ` +
      `Falling back to the first rate returned by Clover: ` +
      `"${taxData.elements[0].name}" at ${taxData.elements[0].rate}`
    );
    defaultTax = taxData.elements[0];
  }

  // 7️⃣ Append both IDs to .env.local
  const envPath = path.resolve(process.cwd(), ".env.local");
  const lines = [
    `CLOVER_CREDIT_TENDER_ID=${creditTender.id}`,
    `CLOVER_TAX_RATE_UUID=${defaultTax.id}`,
  ];
  fs.appendFileSync(envPath, "\n" + lines.join("\n") + "\n");

  console.log("✅ Appended to .env.local:");
  console.log(lines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
