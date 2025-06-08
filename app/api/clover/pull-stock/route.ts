// File: app/api/clover/pull-stock/route.ts

import { NextResponse } from "next/server";
import { pullStockFromClover } from "@/lib/clover/inventoryService";

export async function GET() {
  try {
    // 1. Invoke helper to pull and reconcile stock
    const { updatedCount } = await pullStockFromClover();

    // 2. Return success with summary
    return NextResponse.json({ success: true, updatedCount });
  } catch (err: any) {
    console.error("Pull-Stock error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
