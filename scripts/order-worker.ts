// scripts/order-worker.ts
// -----------------------------------------------------------------------------
// Stand-alone BullMQ worker for order-push jobs.
// 1. Load .env.local → .env (override=true so loaded values can’t be blocked).
// 2. Print debug info to confirm our essential env vars.
// 3. Import the queue module (spins up the Worker).
// -----------------------------------------------------------------------------

import path from 'path';
import { config as loadEnv } from 'dotenv';

// Determine project root
const root = process.cwd();

// 1️⃣ Load `.env.local` first (override any existing vars)
const localResult = loadEnv({
  path: path.join(root, '.env.local'),
  override: true,
});
// 2️⃣ Then load `.env` (override again, in case you keep shared values there)
const envResult = loadEnv({
  path: path.join(root, '.env'),
  override: true,
});

// 3️⃣ Debug output
console.log('────────────────────────────────────────────');
console.log('[worker] dotenv `.env.local` loaded:', localResult.parsed);
console.log('[worker] dotenv   `.env` loaded:',    envResult.parsed);
console.log('[worker] final CLOVER_MERCHANT_ID:', process.env.CLOVER_MERCHANT_ID);
console.log('[worker] final CLOVER_API_TOKEN:   ', process.env.CLOVER_API_TOKEN);
console.log('────────────────────────────────────────────\n');

// 4️⃣ Only after env is confirmed, import the queue (which calls getCloverConfig())
import '@/lib/clover/queues/orderPushQueue';

console.log('[worker] Order-push queue worker is running…');
