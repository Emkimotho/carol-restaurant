// File: app/api/clover/webhook/route.ts
// ----------------------------------------------------------------------
// • Responsibility: handle Clover payment webhooks.
//   1) Verify HMAC SHA-256 signature against CLOVER_SIGNING_SECRET.
//   2) Listen for `payment.updated` events with status `"SUCCESS"`.
//   3) Extract your internal order ID from payment.metadata.orderId.
//   4) Update Prisma order → ORDER_RECEIVED.
//   5) Decrement inventory stock for each line item.
//   6) Broadcast real-time update via WebSocket.
// ----------------------------------------------------------------------

import { NextResponse }          from "next/server";
import { prisma }                from "@/lib/prisma";
import { OrderStatus }           from "@prisma/client";
import crypto                    from "crypto";
import { broadcastStatus }       from "@/app/api/ws/route";

export const runtime = "nodejs"; // enable Node built-ins

export async function POST(req: Request) {
  // 1️⃣ Load webhook secret
  const signingSecret = process.env.CLOVER_SIGNING_SECRET;
  if (!signingSecret) {
    console.error("[Webhook] Missing CLOVER_SIGNING_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // 2️⃣ Read raw body & signature header
  const signature = req.headers.get("Clover-Signature") || "";
  const bodyText  = await req.text();

  // 3️⃣ Verify signature
  const hmac     = crypto.createHmac("sha256", signingSecret);
  hmac.update(bodyText);
  const expected = hmac.digest("base64");
  if (signature !== expected) {
    console.warn("[Webhook] Invalid signature", { expected, received: signature });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 4️⃣ Parse JSON
  let event: any;
  try {
    event = JSON.parse(bodyText);
  } catch (err) {
    console.error("[Webhook] Bad JSON", err);
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // 5️⃣ Only handle payment.updated → SUCCESS
  if (event.type === "payment.updated" && event.data?.object?.status === "SUCCESS") {
    const paymentObj = event.data.object;
    const ourOrderId = paymentObj.metadata?.orderId;
    if (!ourOrderId) {
      console.error("[Webhook] Missing metadata.orderId");
      return NextResponse.json({ error: "Missing orderId metadata" }, { status: 400 });
    }

    // a) Mark order as paid
    await prisma.order.update({
      where: { orderId: ourOrderId },
      data:  { status: OrderStatus.ORDER_RECEIVED },
    });

    // b) Decrement inventory
    const fullOrder = await prisma.order.findUnique({
      where:   { orderId: ourOrderId },
      include: { lineItems: true },
    });
    if (fullOrder?.lineItems) {
      await Promise.all(
        fullOrder.lineItems.map(li =>
          prisma.menuItem.update({
            where: { id: li.menuItemId },
            data:  { stock: { decrement: li.quantity } },
          })
        )
      );
    }

    // c) Broadcast real-time update
    broadcastStatus("PAYMENTS", { orderId: ourOrderId, status: "PAID" });

    console.info(`[Webhook] Order ${ourOrderId} marked PAID and inventory updated.`);
  } else {
    // ignore other events
    console.debug("[Webhook] Ignored event type/status:", event.type, event.data?.object?.status);
  }

  // 6️⃣ Ack receipt
  return NextResponse.json({ received: true }, { status: 200 });
}
