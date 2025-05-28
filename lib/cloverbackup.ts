// File: lib/clover.ts — Hosted-Checkout flow w/ customer details

const REST_BASE     = "https://sandbox.dev.clover.com/v3/merchants";
const CHECKOUT_BASE = "https://sandbox.dev.clover.com/invoicingcheckoutservice/v1";

interface Customer {
  firstName?: string;
  lastName?:  string;
  email?:     string;
  phoneNumber?: string;
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept:        "application/json",
  };
}

export async function createCloverPaymentSession(params: {
  ourOrderId: string;      // your orderId
  amount:     number;      // dollars
  customer?:  Customer;    // optional
}): Promise<{
  checkoutId:  string;
  checkoutUrl: string;
}> {
  const {
    CLOVER_PRIVATE_ECOM_TOKEN,
    MERCHANT_ID,
    NEXT_PUBLIC_BASE_URL = "https://example.com",
  } = process.env;

  if (!CLOVER_PRIVATE_ECOM_TOKEN || !MERCHANT_ID) {
    throw new Error(
      "Missing CLOVER_PRIVATE_ECOM_TOKEN or MERCHANT_ID in env"
    );
  }

  const amountCents = Math.round(params.amount * 100);

  const payload = {
    merchantId: MERCHANT_ID,
    redirectUrls: {
      success: `${NEXT_PUBLIC_BASE_URL}/payment-confirmation/card?id=${params.ourOrderId}`,
      failure: `${NEXT_PUBLIC_BASE_URL}/payment-failed?id=${params.ourOrderId}`,
      cancel : `${NEXT_PUBLIC_BASE_URL}/payment-cancelled?id=${params.ourOrderId}`,
    },
    shoppingCart: {
      lineItems: [
        {
          name:    `Web order ${params.ourOrderId}`,
          price:   amountCents,
          unitQty: 1,
        },
      ],
    },
    customer: params.customer || {},
  };

  // 🔍 Debug logging
  console.log("[DEBUG] Clover request to:", `${CHECKOUT_BASE}/checkouts`);
  console.log("[DEBUG] Headers:", {
    ...authHeaders(CLOVER_PRIVATE_ECOM_TOKEN),
    "X-Clover-Merchant-Id": MERCHANT_ID,
  });
  console.log("[DEBUG] Payload:", JSON.stringify(payload, null, 2));

  const res = await fetch(
    `${CHECKOUT_BASE}/checkouts`,
    {
      method:  "POST",
      headers: {
        ...authHeaders(CLOVER_PRIVATE_ECOM_TOKEN),
        "X-Clover-Merchant-Id": MERCHANT_ID,
      },
      body: JSON.stringify(payload),
    }
  );

  const raw = await res.text();
  console.log("[DEBUG] Clover raw response:", raw);

  let data: any;
  try { data = JSON.parse(raw); }
  catch {
    throw new Error(`Invalid JSON from Clover: ${raw}`);
  }

  const checkoutId  = data.checkoutId || data.checkoutSessionId || data.id;
  const checkoutUrl = data.checkoutPageUrl || data.url || data.href;

  if (!checkoutId || !checkoutUrl) {
    console.error("[DEBUG] Full Clover response:", data);
    throw new Error(
      `Clover checkout error: ${data?.message || res.statusText}`
    );
  }

  return { checkoutId, checkoutUrl };
}
