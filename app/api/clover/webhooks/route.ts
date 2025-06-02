// File: app/api/clover/webhook/route.ts
// ----------------------------------------------------------------------
// • Responsibility: Handle incoming Clover webhooks, specifically
//   the "invoice.paid" event for hosted-checkout payments.
// • When Clover notifies that an invoice has been paid, extract
//   the `externalPaymentContext.ourOrderId` and update the corresponding
//   order in Prisma from "PENDING_PAYMENT" to "ORDER_RECEIVED".
// • If the payload does not include a valid order ID or if any error
//   occurs, log it and still return a 200 to Clover (so it won’t retry).
// ----------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Clover will send a JSON payload like:
 * {
 *   "type": "invoice.paid",
 *   "data": {
 *     "id": "...",
 *     "externalPaymentContext": {
 *       "ourOrderId": "<your-order-id>"
 *     },
 *     // ... other fields we don’t need ...
 *   },
 *   // ... other top-level event metadata ...
 * }
 *
 * This endpoint reads that payload, checks for `type === "invoice.paid"`,
 * pulls out `ourOrderId` from `data.externalPaymentContext`, and flips
 * the local order’s status to "ORDER_RECEIVED".
 */
export async function POST(request: Request) {
  try {
    const event = await request.json();

    // Only handle the invoice.paid event
    if (event.type === "invoice.paid") {
      const ourOrderId = event.data?.externalPaymentContext?.ourOrderId;

      if (typeof ourOrderId === "string" && ourOrderId.trim() !== "") {
        try {
          // Update the order’s status in the database
          await prisma.order.update({
            where: { orderId: ourOrderId },
            data:  { status: "ORDER_RECEIVED" },
          });
          console.log(
            `[Clover Webhook] Order ${ourOrderId} marked as ORDER_RECEIVED`
          );
        } catch (dbErr: any) {
          // If the order isn’t found or another DB error occurs, log it
          console.error(
            `[Clover Webhook] Failed to update order ${ourOrderId}:`,
            dbErr
          );
        }
      } else {
        console.warn(
          "[Clover Webhook] invoice.paid received without externalPaymentContext.ourOrderId",
          event
        );
      }
    } else {
      // If it’s some other event type, just log and ignore
      console.log(`[Clover Webhook] Ignoring event type: ${event.type}`);
    }

    // Respond 200 to acknowledge receipt (so Clover won’t retry)
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Clover Webhook] Error parsing request:", err);
    // Even on error, respond 200 to prevent Clover from retrying repeatedly.
    return NextResponse.json({ received: false }, { status: 200 });
  }
}
