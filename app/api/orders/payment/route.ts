// File: app/api/orders/payment/route.ts

import { NextResponse } from "next/server";
import { cloverFetch, getCloverConfig } from "@/lib/clover";

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
//
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
  // You may optionally send your own redirectUrls, but if you don’t,
  // we’ll fall back to building them here based on ourOrderId.
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

    // Basic validation
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

    // If the client did not send redirectUrls, build defaults here:
    const defaultBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";
    const redirectUrls = body.redirectUrls ?? {
      success: `${defaultBase}/payment-confirmation/card?id=${body.ourOrderId}`,
      failure: `${defaultBase}/payment-failed?id=${body.ourOrderId}`,
      cancel:  `${defaultBase}/payment-cancelled?id=${body.ourOrderId}`,
    };

    // Build the final V1 payload exactly as Clover expects:
    const payload: any = {
      merchantId,
      externalPaymentContext: {
        ourOrderId: body.ourOrderId,
      },
      redirectUrls,
      shoppingCart: {
        // Pass through every line item – base items, modifiers, fees, tip, etc.
        lineItems: body.shoppingCart.lineItems.map((li) => {
          // Only include known keys in the final payload. Clover V1
          // expects either { itemRefUuid, unitQty, taxable, unitPrice? }
          // or { name, unitQty, price, taxable }.
          if (li.itemRefUuid) {
            // “catalog item” line
            const entry: any = {
              itemRefUuid: li.itemRefUuid,
              unitQty:     li.unitQty,
              taxable:     li.taxable ?? true,
            };
            // If the frontend sent unitPrice (in cents), pass it as unitPrice:
            if (typeof li.unitPrice === "number") {
              entry.unitPrice = li.unitPrice;
            }
            return entry;
          } else {
            // “name+price” line (modifier or fee or tip)
            const entry: any = {
              name:    li.name || "",
              unitQty: li.unitQty,
              price:   li.price ?? 0,
              taxable: li.taxable ?? false,
            };
            return entry;
          }
        }),
      },
      customer: body.customer ?? {},
      // Any other V1‐only fields (e.g. “emailReceipt”: true) can be added here.
    };

    console.log("→ Clover payload (sent):", JSON.stringify(payload, null, 2));

    // Call Clover’s Hosted‐Checkout V1 endpoint:
    //    POST https://apisandbox.dev.clover.com/invoicingcheckoutservice/v1/checkouts
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

    // Normalize the Clover response:
    //   • `href` is the actual checkout URL
    //   • `checkoutSessionId` is Clover’s session ID
    const checkoutUrl = response.href;

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
