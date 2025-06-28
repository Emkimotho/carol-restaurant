// File: app/api/orders/payment/route.ts

import { NextResponse }                from "next/server";
import { cloverFetch, getCloverConfig } from "@/lib/clover";
import { prisma }                      from "@/lib/prisma";

const { merchantId } = getCloverConfig();

//
// “shoppingCart.lineItems” may look like this (example):
// [
//   { itemRefUuid: "9JA427599QWEJ", unitQty: 1, taxable: true },
//   { name: "grilled",    unitQty: 1, price: 1025, taxable: true },
//   { name: "extra cheese",unitQty: 1, price: 200, taxable: true },
//   { name: "Delivery Fee",unitQty: 1, price: 500, taxable: false },
//   { name: "Tip",         unitQty: 1, price: 705, taxable: false },
// ]
// We simply forward that entire array to Clover below.

interface ShoppingCartLine {
  itemRefUuid?: string;  // present if this is a catalog‐item line
  unitQty: number;
  taxable?: boolean;
  unitPrice?: number;    // in cents; (we’ll ignore it here, unless you want to use it)
  name?: string;         // present if this is a “name+price” line (e.g. modifiers, fees)
  price?: number;        // in cents
}

interface PaymentRequestBody {
  ourOrderId:   string;
  shoppingCart: {
    lineItems: ShoppingCartLine[];
  };
  customer?: {
    firstName?:   string;
    lastName?:    string;
    email?:       string;
    phoneNumber?: string;
  };
  // Optional redirects; otherwise we build defaults below
  redirectUrls?: {
    success: string;
    failure: string;
    cancel:  string;
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PaymentRequestBody;
    console.log("← /api/orders/payment RECEIVED BODY:", body);

    // Validate payload
    if (
      !body.ourOrderId ||
      typeof body.ourOrderId !== "string" ||
      !body.shoppingCart ||
      !Array.isArray(body.shoppingCart.lineItems)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid payload" },
        { status: 400 }
      );
    }

    // Build default redirect URLs if none provided
    const defaultBase =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
    const redirectUrls = body.redirectUrls ?? {
      success: `${defaultBase}/payment-confirmation/card?id=${body.ourOrderId}`,
      failure: `${defaultBase}/payment-failed?id=${body.ourOrderId}`,
      cancel:  `${defaultBase}/payment-cancelled?id=${body.ourOrderId}`,
    };

    // Construct Clover payload per V1 spec
    const payload: any = {
      merchantId,
      externalPaymentContext: { ourOrderId: body.ourOrderId },
      redirectUrls,
      shoppingCart: {
        lineItems: body.shoppingCart.lineItems.map((li) => {
          if (li.itemRefUuid) {
            const entry: any = {
              itemRefUuid: li.itemRefUuid,
              unitQty:     li.unitQty,
              taxable:     li.taxable ?? true,
            };
            if (typeof li.unitPrice === "number") {
              entry.unitPrice = li.unitPrice;
            }
            return entry;
          } else {
            return {
              name:    li.name || "",
              unitQty: li.unitQty,
              price:   li.price ?? 0,
              taxable: li.taxable ?? false,
            };
          }
        }),
      },
      customer: body.customer ?? {},
    };

    console.log("→ Clover payload (sent):", JSON.stringify(payload, null, 2));

    // Call Clover Hosted-Checkout V1 API
    const response = await cloverFetch<{
      href:              string;
      checkoutSessionId: string;
      expirationTime?:   string;
      createdTime?:      string;
    }>(`/invoicingcheckoutservice/v1/checkouts`, {
      method:  "POST",
      headers: { "X-Clover-Merchant-Id": merchantId },
      body:    JSON.stringify(payload),
    });

    console.log("← Clover returned (raw):", response);

    // Extract URL and session ID
    const checkoutUrl    = response.href;
    const sessionId      = response.checkoutSessionId;

    // **Persist the checkoutSessionId to your Order record**
    await prisma.order.update({
      where: { orderId: body.ourOrderId },
      data:  { checkoutSessionId: sessionId },
    });
    console.log(
      `✅ Persisted checkoutSessionId="${sessionId}" for order="${body.ourOrderId}"`
    );

    console.log("↓↓↓↓ /api/orders/payment RESULT:", { checkoutUrl });
    return NextResponse.json({ success: true, checkoutUrl });
  } catch (err: any) {
    console.error("Create Payment Session Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
