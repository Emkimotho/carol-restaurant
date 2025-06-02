// File: app/api/orders/payment/route.ts
import { NextResponse } from "next/server";
import { createCloverPaymentSession, CartItem } from "@/lib/clover";

/**
 * Expected request body:
 * {
 *   ourOrderId: string;        // your internal order ID (UUID or similar)
 *   cartItems: CartItem[];     // [{ cloverItemId: string, quantity: number, priceOverride?: number }]
 *   deliveryFee: number;       // in dollars (e.g. 3.50)
 *   tip: number;               // in dollars (e.g. 2.00)
 *   customer?: {
 *     firstName?: string;
 *     lastName?: string;
 *     email?: string;
 *     phoneNumber?: string;
 *   }
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("← /api/orders/payment RECEIVED BODY:", body);

    // Basic validation
    if (
      !body.ourOrderId ||
      typeof body.ourOrderId !== "string" ||
      !Array.isArray(body.cartItems)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid payload" },
        { status: 400 }
      );
    }

    // Create the Clover checkout session
    const result = await createCloverPaymentSession({
      ourOrderId:  body.ourOrderId,
      cartItems:   body.cartItems as CartItem[],
      deliveryFee: body.deliveryFee || 0,
      tip:         body.tip         || 0,
      // tax is omitted, letting Clover calculate it automatically
      customer:    body.customer,
    });

    console.log("↓↓↓↓ /api/orders/payment RESULT:", result);

    // Return the URL for the front end to redirect
    return NextResponse.json({ success: true, checkoutUrl: result.checkoutUrl });
  } catch (err: any) {
    console.error("Create Payment Session Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
