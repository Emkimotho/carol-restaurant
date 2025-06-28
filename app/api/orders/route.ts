// File: app/api/orders/route.ts
// ------------------------------------------------------------------
// Thin dispatcher – delegates to controller functions, plus enqueues
// Clover sync job on order creation.
// ------------------------------------------------------------------

// ------------------------------------------------------------------
//  Thin dispatcher
//  • GET  → list orders  (controllers/getOrders.ts)
//  • POST → create order (controllers/createOrder.ts)
//          then enqueue a Clover-sync “push” job.
//
//  NOTE: after createOrder returns 201, we pull BOTH the internal
//        UUID (`id`) and the friendly code (`orderId`) from the JSON
//        response so the queue worker can always locate the row.
// ------------------------------------------------------------------

import { getOrders }       from "./controllers/getOrders";
import { createOrder }     from "./controllers/createOrder";
import { orderPushQueue }  from "@/lib/clover/queues/orderPushQueue";

/* ────────────────────────────────────────────────────────────────── */
/* GET – list or search orders                                       */
/* ────────────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  return getOrders(req);
}

/* ────────────────────────────────────────────────────────────────── */
/* POST – create a new order, then enqueue Clover sync               */
/* ────────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  /* 1️⃣  Create the order in our DB */
  const res = await createOrder(req);

  /* 2️⃣  On success, enqueue the Clover push                         */
  if (res.status === 201) {
    try {
      // clone so that reading JSON here doesn’t consume the body
      const { id, orderId } = await res.clone().json();

      await orderPushQueue.add("push", { id, orderId });
      console.log(`[order-push] Enqueued push for order ${orderId} (${id})`);
    } catch (err) {
      console.error("[order-push] Failed to enqueue Clover sync:", err);
    }
  }

  /* 3️⃣  Return the original controller response                     */
  return res;
}
