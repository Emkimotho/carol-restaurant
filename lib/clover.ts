// File: lib/clover.ts
// ----------------------------------------------------------------------
// Hosted-Checkout v1 wrapper + Catalog fetch: ALL rows use `quantity` + `price` (cents).
// • Catalog: { id, name, price (cents), taxable }
// • Custom : { name, quantity, price, taxable:false }
// ----------------------------------------------------------------------

const CHECKOUT_BASE     = "https://sandbox.dev.clover.com/invoicingcheckoutservice/v1";
const INVENTORY_BASE    = "https://sandbox.dev.clover.com/v3/merchants";

interface Customer {
  firstName?:   string;
  lastName?:    string;
  email?:       string;
  phoneNumber?: string;
}

// CartItem for payments
export interface CartItem {
  cloverItemId:   string;   // catalog SKU UUID
  quantity:       number;   // integer
  priceOverride?: number;   // dollars, optional override
}

// Catalog item returned from Clover
export interface CloverCatalogItem {
  id:        string;
  name:      string;
  price:     number;  // in cents
  taxable:   boolean;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type":  "application/json",
    Accept:         "application/json",
  };
}

/**
 * Fetch catalog items from Clover Inventory API
 */
export async function fetchCloverItems(): Promise<CloverCatalogItem[]> {
  const {
    CLOVER_PRIVATE_ECOM_TOKEN,
    MERCHANT_ID,
  } = process.env!;

  if (!CLOVER_PRIVATE_ECOM_TOKEN || !MERCHANT_ID) {
    throw new Error("Missing CLOVER_PRIVATE_ECOM_TOKEN or MERCHANT_ID");
  }

  const url = `${INVENTORY_BASE}/${MERCHANT_ID}/items`;
  const res = await fetch(url, {
    method: "GET",
    headers: authHeaders(CLOVER_PRIVATE_ECOM_TOKEN),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error fetching Clover items: ${res.status} ${text}`);
  }

  const data = await res.json();
  // Clover v3 returns items under `elements`
  const items = Array.isArray(data.elements) ? data.elements : data.items;

  return items.map((item: any) => ({
    id:      item.id,
    name:    item.name,
    price:   typeof item.price === "number" ? item.price : 0,
    taxable: Boolean(item.taxable),
  }));
}

/**
 * Create a Hosted-Checkout session for an order
 */
export async function createCloverPaymentSession(params: {
  ourOrderId:  string;
  cartItems:   CartItem[];
  deliveryFee: number;   // dollars
  tip:         number;   // dollars
  tax:         number;   // dollars
  customer?:   Customer;
}): Promise<{ checkoutId: string; checkoutUrl: string }> {
  const {
    CLOVER_PRIVATE_ECOM_TOKEN,
    MERCHANT_ID,
    NEXT_PUBLIC_BASE_URL = "https://example.com",
  } = process.env!;

  if (!CLOVER_PRIVATE_ECOM_TOKEN || !MERCHANT_ID) {
    throw new Error("Missing CLOVER_PRIVATE_ECOM_TOKEN or MERCHANT_ID");
  }

  const toCents = (d: number) => Math.round(d * 100);
  const lineItems: any[] = [];

  // 1) Catalog rows
  for (const ci of params.cartItems) {
    const row: any = {
      itemRefUuid: ci.cloverItemId,
      quantity:    ci.quantity,
      taxable:     true,
    };
    if (ci.priceOverride != null) {
      row.price = toCents(ci.priceOverride);
    }
    lineItems.push(row);
  }

  // 2) Delivery Fee
  if (params.deliveryFee > 0) {
    lineItems.push({
      name:     "Delivery Fee",
      quantity: 1,
      price:    toCents(params.deliveryFee),
      taxable:  false,
    });
  }

  // 3) Tip
  if (params.tip > 0) {
    lineItems.push({
      name:     "Tip",
      quantity: 1,
      price:    toCents(params.tip),
      taxable:  false,
    });
  }

  // 4) Tax
  if (params.tax > 0) {
    lineItems.push({
      name:     "Tax",
      quantity: 1,
      price:    toCents(params.tax),
      taxable:  false,
    });
  }

  const payload = {
    merchantId: MERCHANT_ID,
    redirectUrls: {
      success: `${NEXT_PUBLIC_BASE_URL}/payment-confirmation/card?id=${params.ourOrderId}`,
      failure: `${NEXT_PUBLIC_BASE_URL}/payment-failed?id=${params.ourOrderId}`,
      cancel:  `${NEXT_PUBLIC_BASE_URL}/payment-cancelled?id=${params.ourOrderId}`,
    },
    shoppingCart: { lineItems },
    customer:     params.customer || {},
  };

  console.log("[Clover HCv1] Payload:", JSON.stringify(payload, null, 2));

  const res = await fetch(`${CHECKOUT_BASE}/checkouts`, {
    method: "POST",
    headers: {
      ...authHeaders(CLOVER_PRIVATE_ECOM_TOKEN),
      "X-Clover-Merchant-Id": MERCHANT_ID,
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  console.log("[Clover HCv1] Raw response:", raw);

  let data: any;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`Invalid JSON from Clover: ${raw}`); }

  const checkoutId  = data.checkoutId || data.checkoutSessionId || data.id;
  const checkoutUrl = data.checkoutPageUrl   || data.url   || data.href;

  if (!checkoutId || !checkoutUrl) {
    console.error("[Clover HCv1] Full response:", data);
    throw new Error(`Clover checkout error: ${data?.message || res.statusText}`);
  }

  console.log("[Clover HCv1] checkoutId:", checkoutId);
  console.log("[Clover HCv1] checkoutUrl:", checkoutUrl);
  return { checkoutId, checkoutUrl };
}
