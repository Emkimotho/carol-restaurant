// File: app/api/clover/sync-items/[itemId]/route.ts
// ------------------------------------------------------------------
// Single‐item Clover sync endpoint
// POST /api/clover/sync-items/:itemId → calls syncOne(itemId)
// ------------------------------------------------------------------

import { NextResponse } from "next/server";
import { syncOne }      from "@/lib/clover/menuService";

export async function POST(
  request: Request,
  { params }: { params: { itemId: string } | Promise<{ itemId: string }> }
) {
  // Await params before extracting itemId
  const { itemId } = await params;

  try {
    await syncOne(itemId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Clover single‐item sync failed:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
