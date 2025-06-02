// File: app/api/clover/sync-items/[itemId]/route.ts
// ------------------------------------------------------------------
// Single-item Clover sync endpoint
// POST /api/clover/sync-items/:itemId → calls syncOne(itemId)
// ------------------------------------------------------------------

import { NextResponse } from "next/server";
import { syncOne }      from "@/lib/clover/menuService";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ itemId: string }> }
) {
  // Await params before destructuring
  const { itemId } = await ctx.params;

  try {
    await syncOne(itemId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Clover single-item sync failed:", err);
    return NextResponse.json(
      { success: false, error: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
