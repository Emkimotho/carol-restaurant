// File: app/api/clover/poll-orders/route.ts
// Purpose: Failsafe cron endpoint — fetch recent Clover order changes, reconcile into Prisma.

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getCloverConfig, cloverFetch } from "@/lib/cloverClient";
import { STATE_MAP } from "@/lib/clover/handleOrderWebhook";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { merchantId } = getCloverConfig();

  // Determine window (default last 15min)
  const sinceParam = req.nextUrl.searchParams.get("since");
  const since       = sinceParam
    ? new Date(sinceParam)
    : new Date(Date.now() - 15 * 60_000);

  const filter = `lastModifiedTime>${since.getTime()}`;

  try {
    // Fetch changed orders from Clover
    const { elements = [] } = await cloverFetch<{ elements: any[] }>(
      `/v3/merchants/${merchantId}/orders?filter=${encodeURIComponent(filter)}`
    );

    // Reconcile each change
    let updatedCount = 0;
    for (const cl of elements) {
      const mapped = STATE_MAP[cl.state as string];
      if (!mapped) continue;

      const extRef = cl.externalReferenceId as string | undefined;
      if (!extRef) continue;

      const result = await prisma.order.updateMany({
        where: { orderId: extRef, NOT: { status: mapped } },
        data:  { status: mapped, cloverLastSyncAt: new Date() },
      });

      if (result.count > 0) updatedCount += result.count;
    }

    return NextResponse.json({
      checked: elements.length,
      updated: updatedCount,
      since:   since.toISOString(),
    });
  } catch (err: any) {
    console.error("[poll-orders] error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
