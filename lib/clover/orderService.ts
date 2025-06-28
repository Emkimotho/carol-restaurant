// File: lib/clover/orderService.ts
// -----------------------------------------------------------------------------
// Clover-helper utilities:
//  • pushOrderToClover(...) → pushes a local order to Clover, returns internal Clover order ID.
//  • ensureCashTender(...) → idempotently attaches a CASH tender to an existing Clover order.
// -----------------------------------------------------------------------------
//
// Notes:
//  - Clover’s tenders endpoint expects the internal Clover order-ID (the random
//    13-character code returned when the order is first created, e.g. “BW119MR81X78C”),
//    NOT our friendly externalReferenceId. That internal ID is stored in Order.cloverOrderId.
//  - mapOrderToCloverPayload must produce { order, lineItems, tender? } in a shape matching your integration.
//  - We use `as any` when reading properties like `unitPrice` if the declared type doesn’t include them.
// -----------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import { cloverFetch, getCloverConfig } from "@/lib/cloverClient";
import { mapOrderToCloverPayload } from "@/lib/clover/orderMapper";
import { getLocationId } from "@/lib/clover/getLocationId";

const prisma = new PrismaClient();
const { merchantId } = getCloverConfig();

/**
 * Push a local order to Clover Orders API, and return the internal Clover order ID.
 * If order already has cloverOrderId in DB, returns that immediately.
 *
 * @param localOrderId – our local Order.id (UUID)
 * @returns the internal Clover order ID (string)
 */
export async function pushOrderToClover(localOrderId: string): Promise<string> {
  // 1. Load order + necessary relations from DB (include price/title)
  const order = await prisma.order.findUnique({
    where: { id: localOrderId },
    include: {
      lineItems: {
        include: {
          menuItem: {
            select: {
              cloverItemId: true,
              title: true,
              price: true,
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
      // Include other relations as needed for mapping
    },
  });
  if (!order) {
    throw new Error(`pushOrderToClover: local order ${localOrderId} not found`);
  }

  // 2. If already synced, return existing Clover ID
  if (order.cloverOrderId) {
    return order.cloverOrderId;
  }

  // 3. Build rows array for mapping: either prisma lineItems or fallback to legacy items
  let rows: any[] = order.lineItems as any[];
  if (rows.length === 0 && Array.isArray((order as any).items)) {
    rows = (order as any).items.map((j: any) => ({
      quantity: j.quantity ?? 1,
      unitPrice: j.price,
      selectedOptions: j.selectedOptions ?? undefined,
      menuItem: {
        cloverItemId: j.cloverItemId ?? null,
        title: j.title ?? "Item",
        price: j.price,
        optionGroups: [],
      },
    }));
  }

  // 4. Compose note & payload
  const flags: string[] = [];
  if (order.containsAlcohol) flags.push("Contains alcohol");
  if (order.orderType?.toLowerCase() === "golf") flags.push("Golf order");
  const note = [order.orderId, ...flags].join(" · ");

  // 5. Get Clover location ID
  const locationId = await getLocationId();

  // 6. Map to Clover payload
  const payload = mapOrderToCloverPayload(order as any, rows, locationId, note);
  // ── Inject source so it appears in Clover’s Online Orders queue
  ;(payload.order as any).source = {
    type: "ONLINE",
    sourceText: "19th Web",
  };

  // 7. Create empty Clover order
  const { id: cloverOrderId } = await cloverFetch<{ id: string }>(
    `/v3/merchants/${merchantId}/orders`,
    {
      method: "POST",
      body: JSON.stringify({ order: payload.order }),
    }
  );

  // 8. Bulk line items
  const bulkItems = payload.lineItems.map((li, idx) => {
    const liAny = li as any;
    const row = rows[idx];
    const unitQty = parseInt(liAny.unitQty, 10) || 0;

    // Determine priceCents: prefer override from mapper (`price`), then catalog price, then unitPrice
    let priceCents = 0;
    if (liAny.price != null) {
      priceCents = Number(liAny.price);
    } else if (liAny.item && row.menuItem.price != null) {
      priceCents = Math.round(row.menuItem.price * 100);
    } else if (liAny.unitPrice != null) {
      priceCents = Math.round(Number(liAny.unitPrice) * 100);
    } else {
      console.warn(
        "pushOrderToClover: no price found for lineItem; defaulting to 0"
      );
    }

    // Determine name: prefer override (`name`), then catalog title, then fallback
    const name =
      liAny.name ??
      (liAny.item && row.menuItem.title) ??
      "Item";

    const base: any = {
      name,
      price: priceCents,
      unitQty,
      taxable: !!liAny.item,
    };
    if (liAny.item) {
      base.item = liAny.item;
    }
    return base;
  });

  // 8a. Add delivery fee row if needed
  if ((order as any).customerDeliveryFee) {
    bulkItems.push({
      name: "Delivery Fee",
      price: Math.round((order as any).customerDeliveryFee * 100),
      unitQty: 1000,
      taxable: false,
    });
  }

  // 8b. Add tip row if needed
  if (order.tipAmount && order.tipAmount > 0) {
    bulkItems.push({
      name: "Tip",
      price: Math.round(order.tipAmount * 100),
      unitQty: 1000,
      taxable: false,
    });
  }

  const bulkRes = await cloverFetch<Array<{ id: string }>>(
    `/v3/merchants/${merchantId}/orders/${cloverOrderId}/bulk_line_items`,
    { method: "POST", body: JSON.stringify({ items: bulkItems }) }
  );

  // 9. Attach modifiers if any
  for (let i = 0; i < payload.lineItems.length; i++) {
    const liAny = payload.lineItems[i] as any;
    const mods =
      liAny.modifications as Array<{ modifier: { id: string } }> | undefined;
    const lineRes = bulkRes[i];
    if (mods && lineRes && lineRes.id) {
      for (const m of mods) {
        await cloverFetch(
          `/v3/merchants/${merchantId}/orders/${cloverOrderId}/line_items/${lineRes.id}/modifications`,
          { method: "POST", body: JSON.stringify({ modifier: { id: m.modifier.id } }) }
        );
      }
    }
  }

  // 10. Attach tender if non-CASH
  if (payload.tender && (order.paymentMethod as string) !== "CASH") {
    await cloverFetch(
      `/v3/merchants/${merchantId}/orders/${cloverOrderId}/tenders`,
      { method: "POST", body: JSON.stringify({ tender: payload.tender }) }
    );
  }

  // 11. Persist linkage: save cloverOrderId in local DB
  await prisma.order.update({
    where: { id: localOrderId },
    data: { cloverOrderId, cloverLastSyncAt: new Date() },
  });

  return cloverOrderId;
}

/**
 * Idempotently ensure the order has a CASH tender equal to `amount`.
 *
 * @param cloverOrderId – Clover’s internal order-ID (saved in DB)
 * @param amount        – Dollar amount (will be sent as cents)
 */
export async function ensureCashTender(
  cloverOrderId: string,
  amount: number
): Promise<void> {
  if (!cloverOrderId) {
    throw new Error("ensureCashTender: missing cloverOrderId");
  }
  const cents = Math.round(amount * 100);

  // Create (or re-create) the CASH tender; ignore 409 or 405 if already exists or sandbox quirk
  try {
    await cloverFetch(
      `/v3/merchants/${merchantId}/orders/${cloverOrderId}/tenders`,
      {
        method: "POST",
        body: JSON.stringify({
          tender: {
            type: "CASH",
            amount: cents,
            currency: "USD",
          },
        }),
      }
    );
  } catch (err: any) {
    const msg = err.message || "";
    if (msg.includes("409") || msg.includes("405")) {
      // 409 = already exists, 405 = sandbox doesn’t allow GET/POST tenders → treat as success
      return;
    }
    console.error(
      `ensureCashTender: unexpected error creating CASH tender for ${cloverOrderId}:`,
      err
    );
    throw err;
  }
}
