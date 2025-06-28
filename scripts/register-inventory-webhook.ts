// File: scripts/register-inventory-webhook.ts
// ----------------------------------------------------------------------
// Loads .env.local via dotenv, then registers your Clover Inventory webhook.
// ----------------------------------------------------------------------
import dotenv from "dotenv";
import { getCloverConfig, cloverFetch } from "../lib/cloverClient";

// explicitly load `.env.local`
dotenv.config({ path: ".env.local" });

async function registerInventoryWebhook() {
  const { merchantId } = getCloverConfig();
  const webhookUrl     = process.env.INVENTORY_WEBHOOK_URL!;
  const secret         = process.env.CLOVER_WEBHOOK_SECRET!;

  if (!webhookUrl) {
    throw new Error("Missing INVENTORY_WEBHOOK_URL in .env.local");
  }
  if (!secret) {
    throw new Error("Missing CLOVER_WEBHOOK_SECRET in .env.local");
  }

  const body = {
    url:        webhookUrl,
    secret:     secret,
    objectType: "INVENTORY",
    event:      "UPDATE",
  };

  const result = await cloverFetch(
    `/v3/merchants/${merchantId}/webhooks`,
    {
      method: "POST",
      body:   JSON.stringify(body),
    }
  );

  console.log("✅ Registered inventory webhook:", result);
}

registerInventoryWebhook().catch(err => {
  console.error("❌ Webhook registration failed:", err);
  process.exit(1);
});
