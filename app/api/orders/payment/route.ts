// File: app/api/orders/payment/route.ts
// ----------------------------------------------------------------------
// Pay-by-Card endpoint: now uses `quantity` on all rows.
// ----------------------------------------------------------------------

import { NextResponse }               from "next/server";
import { prisma }                     from "@/lib/prisma";
import { OrderStatus }                from "@prisma/client";
import {
  createCloverPaymentSession,
  CartItem,
} from "@/lib/clover";

export async function POST(req: Request) {
  const { orderId } = await req.json();
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where:   { orderId },
    include: { lineItems: { include: { menuItem: true } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status === OrderStatus.ORDER_RECEIVED) {
    return NextResponse.json({ error: "Order already paid" }, { status: 400 });
  }

  const cartItems: CartItem[] = order.lineItems.map(li => ({
    cloverItemId:  li.menuItem.cloverItemId!,
    quantity:      li.quantity,
    priceOverride: li.unitPrice,
  }));
  if (cartItems.length === 0) {
    cartItems.push({
      cloverItemId:  "BQMW1STJT2B0J",
      quantity:      1,
      priceOverride: 1.00,
    });
  }

  const [firstName = "", ...rest] = (order.guestName ?? "").split(" ");
  const customer = {
    firstName,
    lastName:    rest.join(" "),
    email:       order.guestEmail   || undefined,
    phoneNumber: order.guestPhone   || undefined,
  };

  try {
    const { checkoutUrl } = await createCloverPaymentSession({
      ourOrderId:  order.orderId,
      cartItems,
      deliveryFee: order.customerDeliveryFee,
      tip:         order.tipAmount,
      tax:         order.taxAmount,
      customer,
    });
    return NextResponse.json({ checkoutUrl }, { status: 200 });
  } catch (err: any) {
    console.error("[PaymentRoute] failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
