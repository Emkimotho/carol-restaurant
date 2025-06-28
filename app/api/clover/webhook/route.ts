// File: app/api/clover/webhook/route.ts
// ----------------------------------------------------------------------
// • Responsibility: Handle incoming Clover Hosted-Checkout webhooks.
// • For both “invoice.paid” (prod) and “PAYMENT” (sandbox):
//     1) lookup the Order (by orderId or checkoutSessionId),
//     2) if status===PENDING_PAYMENT, flip to ORDER_RECEIVED,
//     3) decrement each MenuItem.stock by its ordered quantity,
//     4) push the new stock level back to Clover,
//     5) broadcast the new status,
//     6) log the updated stock for each item.
// • Always return HTTP 200 so Clover won’t retry on non-transient errors.
// ----------------------------------------------------------------------

import { NextResponse }        from "next/server";
import { prisma }              from "@/lib/prisma";
import { OrderStatus }         from "@prisma/client";
import { broadcast }           from "../../orders/live/route";
import { pushStockToClover }   from "@/lib/cloverClient";

export const config = {
  runtime: "nodejs",
  api:     { bodyParser: false },
};

export async function POST(request: Request) {
  try {
    const event = await request.json();
    console.log("[Clover Webhook] event received:", event.type, event);

    // Only handle these two events
    if (event.type !== "invoice.paid" && event.type !== "PAYMENT") {
      console.log(`[Clover Webhook] ignoring event type=${event.type}`);
      return NextResponse.json({ received: true });
    }

    // 1️⃣ Find the order + its line-items
    let orderWithItems: {
      id: string;
      status: OrderStatus;
      lineItems: { menuItemId: string; quantity: number }[];
    } | null = null;

    if (event.type === "invoice.paid") {
      const ourOrderId = event.data?.externalPaymentContext?.ourOrderId;
      console.log("[Clover Webhook] invoice.paid → ourOrderId:", ourOrderId);
      if (typeof ourOrderId === "string") {
        orderWithItems = await prisma.order.findUnique({
          where: { orderId: ourOrderId },
          include: {
            lineItems: { select: { menuItemId: true, quantity: true } },
          },
        });
      }
    } else {
      const sessionId = event.checkoutSessionId;
      console.log("[Clover Webhook] PAYMENT → checkoutSessionId:", sessionId);
      if (typeof sessionId === "string") {
        orderWithItems = await prisma.order.findUnique({
          where: { checkoutSessionId: sessionId },
          include: {
            lineItems: { select: { menuItemId: true, quantity: true } },
          },
        });
      }
    }

    if (!orderWithItems) {
      console.warn("[Clover Webhook] no matching order found; skipping");
      return NextResponse.json({ received: true });
    }

    // 2️⃣ Only proceed if still pending payment
    if (orderWithItems.status !== OrderStatus.PENDING_PAYMENT) {
      console.log(
        `[Clover Webhook] order=${orderWithItems.id} status=` +
        `${orderWithItems.status} (not PENDING_PAYMENT), skipping`
      );
      return NextResponse.json({ received: true });
    }

    // 3️⃣ In a single transaction, update the order and decrement stock
    const { orderResult, menuUpdates } = await prisma.$transaction(async (tx) => {
      const orderResult = await tx.order.update({
        where: { id: orderWithItems!.id },
        data:  { status: OrderStatus.ORDER_RECEIVED },
        select: { id: true, status: true },
      });

      const menuUpdates: { id: string; stock: number }[] = [];
      for (const li of orderWithItems!.lineItems) {
        const mu = await tx.menuItem.update({
          where:  { id: li.menuItemId },
          data:   { stock: { decrement: li.quantity } },
          select: { id: true, stock: true },
        });
        menuUpdates.push(mu);
      }

      return { orderResult, menuUpdates };
    });

    console.log(
      `[Clover Webhook] order=${orderResult.id} → ` +
      `${orderResult.status}; updated local stocks:`
    );
    for (const mu of menuUpdates) {
      console.log(`  • menuItem ${mu.id} stock is now ${mu.stock}`);
    }

    // 4️⃣ Push updated stock back to Clover
    for (const mu of menuUpdates) {
      const mi = await prisma.menuItem.findUnique({
        where:  { id: mu.id },
        select: { cloverItemId: true, stock: true },
      });
      if (mi?.cloverItemId && typeof mi.stock === "number") {
        await pushStockToClover(mi.cloverItemId, mi.stock);
        console.log(
          `[Clover Sync] pushed new stock for ${mi.cloverItemId}: ${mi.stock}`
        );
      }
    }

    // 5️⃣ Broadcast for live dashboards
    broadcast({
      id:    orderResult.id,
      field: "status",
      value: OrderStatus.ORDER_RECEIVED,
    });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Clover Webhook] processing error:", err);
    // Always return 200 so Clover doesn’t retry indefinitely on app errors
    return NextResponse.json({ received: false }, { status: 200 });
  }
}
