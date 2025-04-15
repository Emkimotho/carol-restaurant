import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Parse the incoming request body.
    const body = await request.json();
    console.log("API: Received payment request payload:", body);

    // Destructure the expected fields.
    const { items, totalAmount, customerName, customerAddress } = body;

    // Validate required fields.
    if (!items || !totalAmount) {
      console.error("API Error: Missing required fields: items or totalAmount");
      return NextResponse.json(
        { error: "Missing required fields: items or totalAmount" },
        { status: 400 }
      );
    }

    // Validate that items is an array.
    if (!Array.isArray(items)) {
      console.error("API Error: 'items' must be an array.");
      return NextResponse.json(
        { error: "'items' must be an array." },
        { status: 400 }
      );
    }

    // Ensure every item includes a valid Clover item ID.
    const missingCloverId = items.find((item: any) => !item.cloverItemId);
    if (missingCloverId) {
      console.error("API Error: Every item must include a valid Clover item ID.");
      return NextResponse.json(
        { error: "Every item must include a valid Clover item ID." },
        { status: 400 }
      );
    }

    // Ensure totalAmount is numeric.
    const parsedAmount = parseFloat(totalAmount);
    if (isNaN(parsedAmount)) {
      console.error("API Error: Invalid totalAmount provided:", totalAmount);
      return NextResponse.json(
        { error: "Invalid totalAmount. It should be a numeric value." },
        { status: 400 }
      );
    }
    const amountInCents = Math.round(parsedAmount * 100);

    // Retrieve Clover credentials from environment variables.
    const CLOVER_ACCESS_TOKEN = process.env.CLOVER_ACCESS_TOKEN;
    const MERCHANT_ID = process.env.MERCHANT_ID;
    // Default redirect URL (update to your production payment confirmation page as needed).
    const REDIRECT_URL =
      process.env.CLOVER_REDIRECT_URL || "https://yourdomain.com/payment-confirmation";
      
    if (!CLOVER_ACCESS_TOKEN || !MERCHANT_ID) {
      console.error("API Error: Missing Clover credentials in environment variables.");
      return NextResponse.json({ error: "Missing Clover credentials" }, { status: 500 });
    }

    // Construct the payment payload.
    const payload = {
      amount: amountInCents,
      currency: "USD",
      order: {
        items: items.map((item: any) => ({
          id: item.cloverItemId,
          quantity: item.quantity || 1,
        })),
      },
      note: `Customer: ${customerName || "N/A"}, Address: ${customerAddress || "N/A"}`,
      tender: { id: "EQA3JDQ5NDBGM" },
      source: "com.clover.webapi",
      redirectUrl: REDIRECT_URL,
    };

    console.log("API: Sending payload to Clover:", payload);

    // Use Clover's sandbox endpoint (update for production as needed).
    const paymentUrl = `https://sandbox.dev.clover.com/v3/merchants/${MERCHANT_ID}/payments`;
    const cloverResponse = await fetch(paymentUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOVER_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("API: Clover response status:", cloverResponse.status);

    if (!cloverResponse.ok) {
      const errorData = await cloverResponse.json();
      console.error("API Error from Clover:", errorData);
      return NextResponse.json(errorData, { status: cloverResponse.status });
    }

    const data = await cloverResponse.json();
    console.log("API: Clover API response data:", data);

    // Fallback to the redirect URL if checkoutUrl is not provided.
    const checkoutUrl = data.checkoutUrl || REDIRECT_URL;
    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("API Exception in payment route:", error);
    return NextResponse.json(
      { error: "Error creating Clover payment session" },
      { status: 500 }
    );
  }
}
