// File: lib/clover/paymentService.ts
import { cloverFetch, getCloverConfig } from "../cloverClient";
const { merchantId } = getCloverConfig();

/**
 * CartItem:
 *   • cloverItemId: string   — the Clover catalog item UUID
 *   • quantity: number
 *   • priceOverride?: number — in dollars; if provided, we send this in cents
 */
export interface CartItem {
  cloverItemId:  string;
  quantity:      number;
  priceOverride?: number;
}

/**
 * PaymentSessionParams:
 *  … (omitted for brevity) …
 */
export interface PaymentSessionParams {
  ourOrderId:    string;
  cartItems:     CartItem[];
  deliveryFee:   number; // in dollars
  tip:           number; // in dollars
  customer?: {
    firstName?:   string;
    lastName?:    string;
    email?:       string;
    phoneNumber?: string;
  };
}

/**
 * Creates a Clover V1 Hosted‐Checkout session for the given order.
 * Returns an object containing { checkoutId, checkoutUrl }.
 */
export async function createCloverPaymentSession(
  params: PaymentSessionParams
): Promise<{ checkoutId: string; checkoutUrl: string }> {
  const toCents = (d: number) => Math.round(d * 100);

  // 1) Build lineItems, overriding any price as unitPrice if needed
  const lineItems: any[] = params.cartItems.map((ci) => {
    const entry: any = {
      itemRefUuid: ci.cloverItemId,
      unitQty:     ci.quantity,
      taxable:     true,
    };
    if (ci.priceOverride != null) {
      entry.unitPrice = toCents(ci.priceOverride);
    }
    return entry;
  });

  // 2) Add “Delivery Fee” row (non‐taxable)
  if (params.deliveryFee > 0) {
    lineItems.push({
      name:    "Delivery Fee",
      unitQty: 1,
      price:   toCents(params.deliveryFee),
      taxable: false,
    });
  }

  // 3) Add “Tip” row (non‐taxable)
  if (params.tip > 0) {
    lineItems.push({
      name:    "Tip",
      unitQty: 1,
      price:   toCents(params.tip),
      taxable: false,
    });
  }

  // 4) Build and log the V1 payload
  const payload: any = {
    merchantId,
    externalPaymentContext: { ourOrderId: params.ourOrderId },
    redirectUrls: {
      success: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-confirmation/card?id=${params.ourOrderId}`,
      failure: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed?id=${params.ourOrderId}`,
      cancel:  `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled?id=${params.ourOrderId}`,
    },
    shoppingCart: { lineItems },
    customer:     params.customer || {},
  };
  console.log("→ Clover payload (sent):", JSON.stringify(payload, null, 2));

  // 5) Call Clover’s V1 endpoint
  const response = await cloverFetch<{
    href:              string;
    checkoutSessionId: string;
    expirationTime?:   string;
    createdTime?:      string;
  }>(
    "/invoicingcheckoutservice/v1/checkouts",
    {
      method:  "POST",
      headers: { "X-Clover-Merchant-Id": merchantId },
      body:    JSON.stringify(payload),
    }
  );

  console.log("← Clover returned (raw):", response);

  // 6) Normalize returned fields
  const checkoutId  = response.checkoutSessionId;
  const checkoutUrl = response.href;
  console.log("↓↓↓↓ createCloverPaymentSession returning:", { checkoutId, checkoutUrl });

  return { checkoutId, checkoutUrl };
}
