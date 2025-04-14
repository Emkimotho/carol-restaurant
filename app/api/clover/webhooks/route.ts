// File: app/api/clover/webhooks/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // Parse the incoming webhook payload.
    const body = await request.json();
    console.log("Webhook payload received from Clover:", body);

    // OPTIONAL: Verify webhook authenticity (using a shared secret or headers)
    // Example: const signature = request.headers.get("x-clover-signature");

    // Expecting a payload shape like:
    // {
    //   updates: [
    //     { cloverItemId: "BQMW1STJT2B0J", stock: 10 },
    //     { cloverItemId: "XYZ", stock: 0 },
    //     ...
    //   ]
    // }
    const { updates } = body;
    if (!updates || !Array.isArray(updates)) {
      console.error("Webhook Error: Invalid payload format, missing 'updates'");
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    // Process each update.
    for (const update of updates) {
      const { cloverItemId, stock } = update;
      if (!cloverItemId) {
        console.warn("Webhook update skipped: Missing cloverItemId in update", update);
        continue;
      }
      if (typeof stock !== "number") {
        console.warn("Webhook update skipped: Invalid stock value", update);
        continue;
      }
      
      // Update the MenuItem record that matches the cloverItemId.
      const updateResult = await prisma.menuItem.updateMany({
        where: { cloverItemId },
        data: { stock },
      });

      console.log(
        `Updated stock for cloverItemId ${cloverItemId}:`,
        updateResult.count
      );
    }

    return NextResponse.json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing Clover webhook:", error);
    return NextResponse.json({ error: "Error processing webhook" }, { status: 500 });
  }
}
