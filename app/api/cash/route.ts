// File: app/api/cash/route.ts

import { NextResponse } from "next/server";

interface CashPaymentRequest {
  orderId: string;
  amountReceived: number;
  customerEmail: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CashPaymentRequest;
    const { orderId, amountReceived, customerEmail } = body;

    if (
      !orderId ||
      typeof orderId !== "string" ||
      typeof amountReceived !== "number" ||
      !customerEmail ||
      typeof customerEmail !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid payload" },
        { status: 400 }
      );
    }

    // At this point, you could update your database to mark the order as paid in cash,
    // create any “cashCollection” records, etc. For now, we just send a confirmation email.

    const subject = "Cash Payment Confirmation";
    const text = `Cash payment of $${amountReceived.toFixed(
      2
    )} received for order #${orderId}.`;
    const html = `<p>Cash payment of <strong>$${amountReceived.toFixed(
      2
    )}</strong> received for order #${orderId}.</p>`;

    // Send confirmation email to the customer
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: customerEmail,
        subject,
        text,
        html,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error processing cash payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
