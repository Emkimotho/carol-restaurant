// File: app/api/clover/payment/route.ts
// ======================================================================
//  POST /api/clover/payment
// ----------------------------------------------------------------------
//  ① Creates a Clover order
//  ② Adds bulk line-items
//  ③ Calls /payments  → returns checkout URL (or we reuse redirectUrl)
//  ④ Responds { checkoutUrl }
//
//  Tender selection:
//     • body.tenderId   → explicit UUID wins
//     • body.tenderType → "cash" | "credit" maps via TENDER_MAP
//     • default         → credit tender (EQA3JDQ5NDBGM)
//
//  Extend TENDER_MAP any time you add more Clover tenders.
// ======================================================================

import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/* 1. Tender map (extend as needed)                                   */
/* ------------------------------------------------------------------ */
const TENDER_MAP: Record<string, string> = {
  credit: "EQA3JDQ5NDBGM", // com.clover.tender.credit_card
  cash  : "HDCAWZ43YECMC", // com.clover.tender.cash
};

const DEFAULT_TENDER_ID = TENDER_MAP.credit;

/* ------------------------------------------------------------------ */
/* 2. Helper: choose tender ID                                        */
/* ------------------------------------------------------------------ */
function chooseTender(type?: string, explicit?: string) {
  if (explicit) return explicit;
  if (type && TENDER_MAP[type]) return TENDER_MAP[type];
  return DEFAULT_TENDER_ID;
}

/* ------------------------------------------------------------------ */
/* 3. Route handler                                                   */
/* ------------------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    /* ── 3.1 Read & validate body ───────────────────────────────── */
    const body = await req.json();
    console.log("PAY ▶︎ incoming", JSON.stringify(body, null, 2));

    const {
      dbId,
      items,
      totalAmount,
      customerName,
      customerAddress,
      tenderId: explicitTenderId,
      tenderType,
    } = body;

    if (!dbId)   return NextResponse.json({ error: "dbId required" }, { status: 400 });
    if (!items?.length)
      return NextResponse.json({ error: "items required" }, { status: 400 });

    const amountCents = Math.round(parseFloat(totalAmount) * 100);
    if (isNaN(amountCents))
      return NextResponse.json({ error: "invalid totalAmount" }, { status: 400 });

    const { CLOVER_ACCESS_TOKEN, MERCHANT_ID, APP_ORIGIN } = process.env;
    if (!CLOVER_ACCESS_TOKEN || !MERCHANT_ID || !APP_ORIGIN) {
      return NextResponse.json(
        { error: "Set CLOVER_ACCESS_TOKEN, MERCHANT_ID, APP_ORIGIN" },
        { status: 500 }
      );
    }

    const tenderId = chooseTender(tenderType, explicitTenderId);
    console.log("PAY ▶︎ tenderId =", tenderId);

    /* ── 3.2 Create Clover order ───────────────────────────────── */
    const orderRes = await fetch(
      `https://sandbox.dev.clover.com/v3/merchants/${MERCHANT_ID}/orders`,
      {
        method : "POST",
        headers: {
          Authorization: `Bearer ${CLOVER_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ state: "OPEN", currency: "USD" }),
      }
    );
    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error("PAY ✗ create-order:", err);
      return NextResponse.json({ error: err }, { status: orderRes.status });
    }
    const cloverOrder = await orderRes.json();
    console.log("PAY ✓ order id:", cloverOrder.id);

    /* ── 3.3 Add bulk line-items ───────────────────────────────── */
    const bulkRes = await fetch(
      `https://sandbox.dev.clover.com/v3/merchants/${MERCHANT_ID}/orders/${cloverOrder.id}/bulk_line_items`,
      {
        method : "POST",
        headers: {
          Authorization: `Bearer ${CLOVER_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: items.map((i: any) => ({
            price   : Math.round(i.price * 100),
            name    : i.title,
            quantity: i.quantity || 1,
            item    : { id: i.cloverItemId },
          })),
        }),
      }
    );
    if (!bulkRes.ok) {
      const err = await bulkRes.text();
      console.error("PAY ✗ bulk_line_items:", err);
      return NextResponse.json({ error: err }, { status: bulkRes.status });
    }
    console.log("PAY ✓ items added");

    /* ── 3.4 Start payment session (/payments) ─────────────────── */
    const redirectUrl = `${APP_ORIGIN}/payment-confirmation?id=${dbId}`;
    console.log("PAY ▶︎ /payments redirectUrl =", redirectUrl);

    const payRes = await fetch(
      `https://sandbox.dev.clover.com/v3/merchants/${MERCHANT_ID}/payments`,
      {
        method : "POST",
        headers: {
          Authorization: `Bearer ${CLOVER_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount   : amountCents,
          currency : "USD",
          order    : { id: cloverOrder.id },
          note     : `Customer: ${customerName}, Address: ${customerAddress}`,
          tender   : { id: tenderId },
          source   : "com.clover.webapi",
          redirectUrl,
        }),
      }
    );

    const payText = await payRes.text();
    let payJson: any = {};
    try { payJson = JSON.parse(payText); } catch { /* ignore */ }

    if (!payRes.ok) {
      console.error("PAY ✗ payment error:", payText);
      return NextResponse.json({ error: payText }, { status: payRes.status });
    }
    console.log("PAY ✓ payment success:", payText);

    /* ── 3.5 Extract or fallback checkout URL ───────────────────── */
    const checkoutUrl =
      payJson.checkoutUrl || payJson.url || payJson._links?.self?.href || redirectUrl;

    console.log("PAY ✓ checkoutUrl =", checkoutUrl);
    return NextResponse.json({ checkoutUrl });
  } catch (err: any) {
    console.error("PAY ✗ unexpected:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
