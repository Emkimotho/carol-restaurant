// File: app/api/clover/webhook/inventory/route.ts
// ----------------------------------------------------------------------
// • Responsibility: Handle Clover inventory‐update webhooks.
// • 1) Respond to verificationCode handshake
// • 2) Verify HMAC signature via CLOVER_WEBHOOK_SECRET
// • 3) On objectType="INVENTORY" & event="UPDATE", update Prisma stock
// ----------------------------------------------------------------------

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";

export const config = {
  runtime: "nodejs",
  api:     { bodyParser: false },
};

/** 
 * Verify that the raw payload matches Clover’s signature header.
 * Uses HMAC‐SHA256 with base64 encoding.
 */
function verifyCloverSignature(payload: string, signature: string): boolean {
  const secret = process.env.CLOVER_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Inventory Webhook] Missing CLOVER_WEBHOOK_SECRET");
    return false;
  }
  const hmac = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("base64");

  const sigBuf  = Buffer.from(signature, "base64");
  const hmacBuf = Buffer.from(hmac, "base64");
  if (sigBuf.length !== hmacBuf.length) {
    return false;
  }
  return timingSafeEqual(sigBuf, hmacBuf);
}

export async function POST(request: Request) {
  // Read raw text so we can both parse & verify
  const payloadText = await request.text();

  // Parse JSON early to capture verificationCode handshake
  let event: any;
  try {
    event = JSON.parse(payloadText);
  } catch (err) {
    console.error("[Inventory Webhook] JSON parse error", err);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  // 1️⃣ Handle Clover’s verification handshake
  if (typeof event.verificationCode === "string") {
    console.log("[Inventory Webhook] verificationCode received:", event.verificationCode);
    // Echo it back exactly so Dashboard “Verify” succeeds :contentReference[oaicite:1]{index=1}
    return NextResponse.json({ verificationCode: event.verificationCode });
  }

  // 2️⃣ Verify signature header
  // Clover may send either X-Clover-Signature or X-Clover-Auth
  const signature = 
    request.headers.get("X-Clover-Signature") 
    ?? request.headers.get("X-Clover-Auth") 
    ?? "";
  if (!verifyCloverSignature(payloadText, signature)) {
    console.warn("[Inventory Webhook] invalid signature");
    return NextResponse.json({ received: false }, { status: 401 });
  }

  // 3️⃣ Only process actual inventory‐update events
  if (event.objectType !== "INVENTORY" || event.event !== "UPDATE") {
    return NextResponse.json({ received: true });
  }

  const { itemId, newQuantity } = event.payload ?? {};
  if (typeof itemId !== "string" || typeof newQuantity !== "number") {
    console.error("[Inventory Webhook] malformed payload", event.payload);
    return NextResponse.json({ received: false }, { status: 400 });
  }

  // 4️⃣ Update your database
  try {
    await prisma.menuItem.update({
      where: { cloverItemId: itemId },
      data:  { stock: newQuantity },
    });
    console.log(`[Inventory Webhook] ${itemId} → stock ${newQuantity}`);
  } catch (err) {
    console.error("[Inventory Webhook] Prisma update error:", err);
    // return 200 so Clover won’t retry indefinitely
  }

  return NextResponse.json({ received: true });
}
