// File: lib/clover/pushOrderToClover.ts
// -----------------------------------------------------------------------------
// Push ONE local order to Clover Orders API.
//
// • Sends externalReferenceId + note so staff see
//   “ORD-… · Contains alcohol · Golf order · Scheduled @ 6/29 5:30 PM”.
// • Adds source { type:"ONLINE", sourceText:"19th Web" }.
// • Uses /bulk_line_items (unitQty thousandths; 1000 = 1.000).
// • Delivery-fee & Tip are loose, non-taxable rows.
// -----------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client';
import { cloverFetch, getCloverConfig } from '@/lib/cloverClient';
import { mapOrderToCloverPayload } from '@/lib/clover/orderMapper';
import { getLocationId } from '@/lib/clover/getLocationId';
import { ET, pretty } from '@/lib/time';               //  ← NEW

const prisma = new PrismaClient();
const { merchantId } = getCloverConfig();

/* helper: strip null / undefined */
const stripNulls = <T>(o: T): T => JSON.parse(JSON.stringify(o));

export async function pushOrderToClover(localOrderId: string): Promise<string> {
  /* ── 1. Load order + relations ───────────────────────────────────────── */
  const order = await prisma.order.findUnique({
    where: { id: localOrderId },
    include: {
      lineItems: {
        include: {
          menuItem: {
            include: {
              optionGroups: {
                include: {
                  choices: {
                    include: {
                      nestedOptionGroup: { include: { choices: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!order) throw new Error(`Order ${localOrderId} not found`);
  if (order.cloverOrderId) return order.cloverOrderId; // already synced

  /* ── 2. Legacy JSON-items fallback ───────────────────────────────────── */
  let rows: any[] = order.lineItems as any[];
  if (rows.length === 0 && (order as any).items) {
    rows = (order as any).items.map((j: any) => ({
      quantity:        j.quantity ?? 1,
      unitPrice:       j.price,
      selectedOptions: j.selectedOptions ?? undefined,
      menuItem: {
        cloverItemId: j.cloverItemId ?? null,
        title:        j.title        ?? 'Item',
        optionGroups: [],
      },
    }));
  }

  /* ── 3. Compose flags & note ─────────────────────────────────────────── */
  const flags: string[] = [];
  if (order.containsAlcohol) flags.push('Contains alcohol');
  if (order.orderType?.toLowerCase() === 'golf') flags.push('Golf order');

  // ----- NEW: ASAP / Scheduled flag -----
  if (order.schedule) {
    const when = ET(order.schedule);
    flags.push(`Scheduled @ ${pretty(when, {
      dateStyle: 'short',
      timeStyle: 'short',
    })}`);
  } else {
    flags.push('ASAP');
  }

  const note = [order.orderId, ...flags].join(' · ');

  /* ── 4. Build Clover payload (uses note) ─────────────────────────────── */
  const locationId = await getLocationId();
  const payload = mapOrderToCloverPayload(order as any, rows, locationId, note);

  (payload.order as any).source = {
    type: 'ONLINE',
    sourceText: '19th Web',
  };

  /* ── 5. Create empty Clover order ------------------------------------- */
  const { id: cloverOrderId } = await cloverFetch<{ id: string }>(
    `/v3/merchants/${merchantId}/orders`,
    { method: 'POST', body: JSON.stringify({ order: payload.order }) },
  );

  /* ── 6. Build /bulk_line_items ---------------------------------------- */
  const bulkItems = payload.lineItems.map((li, idx) => {
    const row       = rows[idx];
    const unitQty   = parseInt((li as any).unitQty, 10); // thousandths
    const priceCents =
      'item' in li
        ? Math.round(row.menuItem.price * 100)
        : Math.round(row.unitPrice * 100);

    const name =
      'name' in li ? (li as any).name : row.menuItem.title ?? 'Item';

    return stripNulls({
      name,
      price: priceCents,
      unitQty,
      ...('item' in li
        ? { item: li.item, taxable: true }
        : { taxable: false }),
    });
  });

  /* 6a – delivery fee (non-tax) */
  if (order.customerDeliveryFee) {
    bulkItems.push({
      name:    'Delivery Fee',
      price:   Math.round(order.customerDeliveryFee * 100),
      unitQty: 1000,
      taxable: false,
    });
  }

  /* 6b – tip (non-tax) */
  if (order.tipAmount) {
    bulkItems.push({
      name:    'Tip',
      price:   Math.round(order.tipAmount * 100),
      unitQty: 1000,
      taxable: false,
    });
  }

  /* 6c – POST /bulk_line_items */
  const bulkRes = await cloverFetch<Array<{ id: string }>>(
    `/v3/merchants/${merchantId}/orders/${cloverOrderId}/bulk_line_items`,
    { method: 'POST', body: JSON.stringify({ items: bulkItems }) },
  );

  /* ── 7. Attach modifiers --------------------------------------------- */
  for (let i = 0; i < rows.length; i++) {
    const mods = (payload.lineItems[i] as any).modifications;
    if (!mods?.length) continue;

    const lineId = bulkRes[i].id; // index aligned
    for (const m of mods) {
      await cloverFetch(
        `/v3/merchants/${merchantId}/orders/${cloverOrderId}` +
          `/line_items/${lineId}/modifications`,
        { method: 'POST', body: JSON.stringify({ modifier: { id: m.modifier.id } }) },
      );
    }
  }

  /* ── 8. Attach tender if non-cash ------------------------------------- */
  if (payload.tender && order.paymentMethod !== 'CASH') {
    await cloverFetch(
      `/v3/merchants/${merchantId}/orders/${cloverOrderId}/tenders`,
      { method: 'POST', body: JSON.stringify({ tender: payload.tender }) },
    );
  }

  /* ── 9. Persist linkage ---------------------------------------------- */
  await prisma.order.update({
    where: { id: localOrderId },
    data:  { cloverOrderId, cloverLastSyncAt: new Date() },
  });

  return cloverOrderId;
}
