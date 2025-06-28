// File: app/api/clover/webhook/order-updates/route.ts
// Purpose: Node runtime Route Handler — receives Clover order webhooks,
//          disables body parsing to access raw body, verifies HMAC SHA‑256 signature,
//          then updates Prisma via handleOrderWebhook.

export const config = {
  runtime: "nodejs",          // ensure Node runtime (not Edge)
  api: { bodyParser: false },  // disable Next.js body parsing
};

import { NextRequest, NextResponse } from "next/server";
import { handleOrderWebhook } from "@/lib/clover/handleOrderWebhook";

// POST /api/clover/webhook/order-updates
export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-clover-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing X-Clover-Signature header" },
      { status: 400 }
    );
  }

  // Read raw buffer for signature verification
  const rawBody = Buffer.from(await req.arrayBuffer());

  try {
    await handleOrderWebhook(rawBody, signature);
    return new NextResponse("ok", { status: 200 });
  } catch (err: any) {
    console.error("[clover-webhook] error:", err);
    return NextResponse.json(
      { error: err.message || "Webhook processing failed" },
      { status: 400 }
    );
  }
}

// GET → 405 Method Not Allowed
export function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}
