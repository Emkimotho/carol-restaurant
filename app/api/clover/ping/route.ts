// File: app/api/clover/ping/route.ts

import { NextResponse } from "next/server";
import { cloverFetch, getCloverConfig } from "@/lib/cloverClient";

export async function GET() {
  try {
    const { merchantId } = getCloverConfig();
    // Use v3 “Get Merchant” endpoint instead of v2
    const merchant = await cloverFetch(`/v3/merchants/${merchantId}`);
    return NextResponse.json({ success: true, merchant });
  } catch (error: any) {
    console.error("[Clover Ping Error]", error);
    return NextResponse.json(
      { success: false, message: error.message || String(error) },
      { status: 500 }
    );
  }
}
