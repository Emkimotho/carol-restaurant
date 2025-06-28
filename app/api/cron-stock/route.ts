// File: app/api/cron-stock/route.ts
import { NextResponse } from "next/server";
import { getCloverConfig, cloverFetch } from "@/lib/cloverClient";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const { merchantId } = getCloverConfig();
  let offset = 0;
  const limit = 250;
  let batch: Array<any>;

  do {
    const url = `/v3/merchants/${merchantId}/items?expand=itemStock&limit=${limit}&offset=${offset}`;
    const resp = await cloverFetch<{ elements: any[] }>(url);
    batch = resp.elements;
    for (const it of batch) {
      const qty = Number(it.itemStock?.quantity ?? 0);
      await prisma.menuItem.updateMany({
        where: { cloverItemId: it.id },
        data: { stock: qty },
      });
    }
    offset += limit;
  } while (batch.length === limit);

  return NextResponse.json({ success: true });
}
