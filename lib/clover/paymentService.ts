// -----------------------------------------------------------------------------
// Builds a Clover *Hosted-Checkout* (Invoicing V3) session.
//
// • Every taxable catalogue item is tagged with your sales-tax UUID so Clover
//   charges tax during checkout.
// • Delivery-fee and Tip remain non-taxable rows.
// • The checkout is tied to your own orderId via externalPaymentContext.
// -----------------------------------------------------------------------------

import { cloverFetch, getCloverConfig } from "@/lib/cloverClient";

const { merchantId: locationId } = getCloverConfig();

/* ─────────── env ─────────── */
const SALES_TAX_ID = process.env.CLOVER_TAX_RATE_UUID;
if (!SALES_TAX_ID?.trim()) {
  throw new Error("Missing CLOVER_TAX_RATE_UUID in .env(.local)");
}

/* ─────────── types ─────────── */
export interface CartItem {
  cloverItemId:   string;
  quantity:       number;
  /** unit-price override (in dollars) – optional */
  priceOverride?: number;
}

export interface PaymentSessionParams {
  ourOrderId:  string;
  cartItems:   CartItem[];
  deliveryFee: number;     // dollars
  tip:         number;     // dollars
  customer?: {
    firstName?:   string;
    lastName?:    string;
    email?:       string;
    phoneNumber?: string;
  };
}

/* ───────── helper ─────────── */
const toCents = (d: number) => Math.round(d * 100);

/* ───────── main fn ────────── */
export async function createCloverPaymentSession(
  params: PaymentSessionParams,
): Promise<{ checkoutId: string; checkoutUrl: string }> {
  /* 1 ── build catalogue rows (taxable) */
  const lineItems = params.cartItems.map((ci) => {
    const itm: Record<string, any> = {
      itemRefUuid: ci.cloverItemId,
      unitQty:     ci.quantity,
      taxable:     true,
      taxRates:    [{ id: SALES_TAX_ID }],
    };
    if (ci.priceOverride != null) {
      itm.unitPrice = toCents(ci.priceOverride);
    }
    return itm;
  });

  /* 2 ── loose rows (non-taxable) */
  if (params.deliveryFee > 0) {
    lineItems.push({
      name:    "Delivery Fee",
      unitQty: 1,
      price:   toCents(params.deliveryFee),
      taxable: false,
    });
  }
  if (params.tip > 0) {
    lineItems.push({
      name:    "Tip",
      unitQty: 1,
      price:   toCents(params.tip),
      taxable: false,
    });
  }

  /* 3 ── payload */
  const payload = {
    merchantId: locationId,
    externalPaymentContext: {
      /* human-readable for staff & customer                           */
      /* will surface on the order list once “Show external reference” */
      ourOrderId: params.ourOrderId,
    },
    redirectUrls: {
      success: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-confirmation/card?id=${params.ourOrderId}`,
      failure: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-failed?id=${params.ourOrderId}`,
      cancel:  `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled?id=${params.ourOrderId}`,
    },
    shoppingCart: { lineItems },
    customer: params.customer ?? {},
  };

  console.log("→ Clover checkout payload:", JSON.stringify(payload, null, 2));

  /* 4 ── fire request */
  const endpoint = `/invoicingcheckoutservice/v3/locations/${locationId}/checkouts`;

  const res = await cloverFetch<{
    href: string;
    checkoutSessionId: string;
  }>(endpoint, {
    method:  "POST",
    headers: { "X-Clover-Merchant-Id": locationId },
    body:    JSON.stringify(payload),
  });

  console.log("← Clover checkout response:", res);

  return {
    checkoutId:  res.checkoutSessionId,
    checkoutUrl: res.href,
  };
}
