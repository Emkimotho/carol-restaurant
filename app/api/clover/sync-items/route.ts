// File: app/api/clover/sync-items/route.ts

import { NextResponse } from "next/server";
import { syncAllMenuItems } from "@/lib/clover/menuService";

export async function POST() {
  try {
    const result = await syncAllMenuItems();
    return NextResponse.json({ success: true, syncedCount: result.count });
  } catch (err: any) {
    console.error("Sync All Menu Items Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || String(err) },
      { status: 500 }
    );
  }
}
