/* ------------------------------------------------------------------
   File: lib/clover/checkout.ts
   ------------------------------------------------------------------
   Hosted‑Checkout v1 helper (suitable for web redirects) plus its
   CartItem type.  Works in both sandbox and production.
   ------------------------------------------------------------------ */

import { cloverFetch, getCloverConfig } from "../cloverClient";

/** Cart row sent to Clover */
export interface CartItem {
  cloverItemId: string;   // catalog item UUID
  quantity: number;
  /** optional unit‑price override in *dollars* (will be converted to cents) */
  priceOverride?: number;
}

interface Customer {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
}

/**
 * Create a Hosted‑Checkout session and return { checkoutId, checkoutUrl }.
 */
export async function createCloverPaymentSession(params: {
  ourOrderId: string;
  cartItems: CartItem[];
  deliveryFee: number;     // dollars
  tip: number;             // dollars
  tax: number;             // dollars
  customer?: Customer;
}): Promise<{ checkoutId: string; checkoutUrl: string }> {
  const { baseUrl, merchantId, privToken } = getCloverConfig();
  const CHECKOUT_BASE = `${baseUrl.replace("/v3", "")}/invoicingcheckoutservice/v1`;

  const toCents = (d: number) => Math.round(d * 100);

  const lineItems: any[] = params.cartItems.map((ci) => ({
    itemRefUuid: ci.cloverItemId,
    quantity: ci.quantity,
    ...(ci.priceOverride != null && { price: toCents(ci.priceOverride) }),
    taxable: true,
  }));

  if (params.deliveryFee > 0) {
    lineItems.push({
      name: "Delivery Fee",
      price: toCents(params.deliveryFee),
      quantity: 1,
      taxable: false,
    });
  }
  if (params.tip > 0) {
    lineItems.push({
      name: "Tip",
      price: toCents(params.tip),
      quantity: 1,
      taxable: false,
    });
  }
  if (params.tax > 0) {
    lineItems.push({
      name: "Tax",
      price: toCents(params.tax),
      quantity: 1,
      taxable: false,
    });
  }

  const payload = {
    merchantId,
    shoppingCart: { lineItems },
    redirectUrls: {
      success: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-confirmation/card?id=${params.ourOrderId}`,
      failure: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed?id=${params.ourOrderId}`,
      cancel:  `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled?id=${params.ourOrderId}`,
    },
    customer: params.customer ?? {},
  };

  const { checkoutId, checkoutPageUrl } = await cloverFetch<{
    checkoutId: string;
    checkoutPageUrl: string;
  }>(`${CHECKOUT_BASE}/checkouts`, {
    method: "POST",
    headers: {
      "X-Clover-Merchant-Id": merchantId,
      Authorization: `Bearer ${privToken}`,
    },
    body: JSON.stringify(payload),
  });

  return { checkoutId, checkoutUrl: checkoutPageUrl };
}
