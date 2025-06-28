// scripts/sync-clover-inventory.ts

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { prisma }            from "../lib/prisma";
import { getCloverConfig, cloverFetch } from "../lib/cloverClient";

async function syncInventory() {
  const { merchantId } = getCloverConfig();
  const limit  = 250;
  let   offset = 0;
  let   batch: Array<{
    id: string;
    itemStock?: { quantity?: number };
  }>;

  do {
    // 🔑 Correct endpoint + expand stock
    const url = `/v3/merchants/${merchantId}/items?expand=itemStock&limit=${limit}&offset=${offset}`;
    const resp = await cloverFetch<{ elements: typeof batch }>(url);
    batch = resp.elements;
    console.log(`Fetched ${batch.length} items (offset ${offset})`);

    // Update your own DB
    await Promise.all(batch.map(it => {
      const qty = it.itemStock?.quantity;
      if (typeof qty === "number") {
        return prisma.menuItem.updateMany({
          where: { cloverItemId: it.id },
          data:  { stock: qty },
        });
      }
      return Promise.resolve();
    }));

    offset += limit;
  } while (batch.length === limit);

  console.log("✅ Clover → DB sync complete");
  await prisma.$disconnect();
}

syncInventory().catch(err => {
  console.error("Sync failed:", err);
  process.exit(1);
});
