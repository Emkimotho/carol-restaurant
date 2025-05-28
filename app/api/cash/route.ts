// File: app/api/cash/route.ts

import { NextResponse } from "next/server";
import { fetchCloverItems } from "@/lib/clover";  // Reuse Clover API functions for other tasks if needed
import { OrderContext } from "@/contexts/OrderContext";  // For accessing the current order (if needed)

export async function POST(req: Request) {
  try {
    // Get body data from request
    const body = await req.json();
    const { orderId, amountReceived } = body;

    // Here, process the cash payment confirmation by interacting with Clover (or other logic)
    // No need to interact with Clover API for cash payments immediately

    // Update order state to reflect cash payment status
    // Optionally, you can send email notification about cash payment received
    const email = "customer@example.com"; // Get the email from the order context
    const subject = "Cash Payment Confirmation";
    const text = `Cash payment of $${amountReceived} received for order #${orderId}.`;
    const html = `<p>Cash payment of <strong>$${amountReceived}</strong> received for order #${orderId}.</p>`;

    // Send confirmation email to customer
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject,
        text,
        html,
      }),
    });

    // Clear the cart or other actions you want to take after payment (as needed)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing cash payment:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
