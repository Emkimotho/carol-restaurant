// File: app/api/clover/push-order/[orderId]/route.ts
// ------------------------------------------------------------------
// Manual trigger
//   POST  /api/clover/push-order/{orderId}[?force=true]
//   • Enqueues a BullMQ “push” job so the order is resent to Clover.
// ------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { orderPushQueue } from "@/lib/clover/queues/orderPushQueue";

/**
 * POST handler – adds a “push” job to the order-push queue.
 * If ENABLE_CLOVER_SYNC is *not* true, you can still force a run
 * with  ?force=true
 */
export async function POST(
  req: NextRequest,
  ctx: { params: { orderId: string } }
) {
  /* 1 ─ route params are a Promise in App Router – await them */
  const { orderId } = await ctx.params;

  /* 2 ─ optional flag */
  const force = req.nextUrl.searchParams.get("force") === "true";

  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  /* 3 ─ feature-flag guard */
  if (process.env.ENABLE_CLOVER_SYNC !== "true" && !force) {
    return NextResponse.json(
      { enqueued: false, message: "Clover sync disabled in dev" },
      { status: 202 }
    );
  }

  /* 4 ─ enqueue the job (note: OrderPushJobData expects **id**) */
  await orderPushQueue.add("push", { id: orderId, force });

  return NextResponse.json(
    { enqueued: true, orderId, force },
    { status: 202 }
  );
}
