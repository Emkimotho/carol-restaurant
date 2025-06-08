// File: app/api/clover/push-stock/route.ts

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pushStockToClover } from "@/lib/clover/inventoryService";

export async function POST(request: NextRequest) {
  try {
    // 1. Parse JSON body
    const body = await request.json();

    // 2. Validate required fields
    const { itemId, newQuantity } = body;
    if (typeof itemId !== "string" || typeof newQuantity !== "number") {
      return NextResponse.json(
        { success: false, error: "Invalid payload: 'itemId' must be a string and 'newQuantity' must be a number." },
        { status: 400 }
      );
    }

    // 3. Invoke helper to push stock
    await pushStockToClover(itemId, newQuantity);

    // 4. Return success
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Push-Stock error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
