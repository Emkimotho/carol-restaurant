// File: app/api/orders/payment/route.ts
// -----------------------------------------------------------------------------
// Builds a Clover *Hosted-Checkout* (Invoicing V1) session.
//
// • Every taxable catalogue item is tagged with your sales-tax UUID so Clover
//   charges tax during checkout.
// • Delivery-fee and Tip remain non-taxable rows.
// • The checkout is tied to your own orderId via externalPaymentContext.
// -----------------------------------------------------------------------------

import { NextResponse }                   from "next/server";
import { cloverFetch, getCloverConfig }  from "@/lib/cloverClient";
import { prisma }                         from "@/lib/prisma";

// ─── Debug: log out exactly what config we’re using in production ────────
const config = getCloverConfig();
console.log("▶️ Clover Config:", config);

const { merchantId, token: authToken } = config;

interface ShoppingCartLine {
  itemRefUuid?: string;   // present if this is a catalog-item line
  unitQty: number;
  taxable?: boolean;
  unitPrice?: number;     // in cents; used if provided
  name?: string;          // present if this is a “name+price” line
  price?: number;         // in cents
}

interface PaymentRequestBody {
  ourOrderId: string;
  shoppingCart: {
    lineItems: ShoppingCartLine[];
  };
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  };
  // Optional redirects; otherwise defaults are built below
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
            // catalog-item row
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
            // name+price row (e.g. modifiers, fees)
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
    }>(`/invoicingcheckoutservice/v1/checkouts`, {
      method:  "POST",
      headers: {
        "X-Clover-Merchant-Id": merchantId,
        Authorization:          `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    console.log("← Clover returned (raw):", response);

    // Extract URL and session ID
    const checkoutUrl = response.href;
    const sessionId   = response.checkoutSessionId;

    // ** Persist the checkoutSessionId to your Order record **
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
