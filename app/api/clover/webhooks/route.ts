// File: app/api/clover/webhook/route.ts
// ----------------------------------------------------------------------
// • Responsibility: Handle incoming Clover webhooks, specifically
//   the "invoice.paid" event for Hosted-Checkout payments.
// • When Clover notifies that an invoice has been paid, extract
//   the `externalPaymentContext.ourOrderId` and, if that order is still
//   PENDING_PAYMENT, flip it to ORDER_RECEIVED in the database.
// • Also broadcast the status change over your WS channel so any
//   connected dashboards update immediately.
// • Always return HTTP 200 so Clover won’t retry on non-transient errors.
// ----------------------------------------------------------------------

import { NextResponse }        from "next/server";
import { prisma }              from "@/lib/prisma";
import { OrderStatus }         from "@prisma/client";
// Adjust the import path below if your live-update route is elsewhere:
import { broadcast }           from "../../orders/live/route";

export async function POST(request: Request) {
  try {
    const event = await request.json();

    // 1️⃣ We only care about invoice.paid
    if (event.type === "invoice.paid") {
      const ourOrderId = event.data?.externalPaymentContext?.ourOrderId;
      if (typeof ourOrderId === "string" && ourOrderId.trim()) {
        // 2️⃣ Lookup the internal record
        const orderRow = await prisma.order.findUnique({
          where:  { orderId: ourOrderId },
          select: { id: true, status: true },
        });

        if (orderRow && orderRow.status === OrderStatus.PENDING_PAYMENT) {
          // 3️⃣ Flip to ORDER_RECEIVED
          await prisma.order.update({
            where: { orderId: ourOrderId },
            data:  { status: OrderStatus.ORDER_RECEIVED },
          });

          // 4️⃣ Broadcast over WS so front-ends update live
          broadcast({
            id:    orderRow.id,
            field: "status",
            value: OrderStatus.ORDER_RECEIVED,
          });

          console.log(
            `[Clover Webhook] order=${ourOrderId} → ${OrderStatus.ORDER_RECEIVED}`
          );
        } else {
          console.log(
            `[Clover Webhook] skipping update for order=${ourOrderId} ` +
            `(not found or status !== PENDING_PAYMENT)`
          );
        }
      } else {
        console.warn(
          "[Clover Webhook] invoice.paid missing externalPaymentContext.ourOrderId",
          event
        );
      }
    } else {
      // ignore anything else
      console.log(`[Clover Webhook] ignoring event type=${event.type}`);
    }

    // Always 200 back to Clover
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Clover Webhook] error processing request:", err);
    // still return 200 to avoid retry loops
    return NextResponse.json({ received: false }, { status: 200 });
  }
}
