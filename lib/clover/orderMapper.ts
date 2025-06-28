// File: lib/clover/orderMapper.ts
// -----------------------------------------------------------------------------
// Convert ONE local Order (+ OrderLineItems) → Clover POST /orders payload.
//
// • Catalogue item  → { item:{id}, unitQty, name?, price?, modifications? }
// • Loose / custom   → { name, price, unitQty }
// • unitQty          → thousandths as string ("1" → "1000", "2.5" → "2500")
// • If a `note` is provided it will be embedded into the order block.
// -----------------------------------------------------------------------------

import type {
  Order,
  OrderLineItem,
  MenuItemOptionGroup,
  MenuOptionChoice,
  NestedOptionChoice,
} from "@prisma/client";

/* ───────────────── line-item shapes ───────────────── */
export type CloverCatalogLI = {
  item: { id: string };
  unitQty: string;
  name?: string;
  price?: number; // in cents (overrides catalog price)
  modifications?: {
    modifier: { id: string; modifierGroup?: { id: string } };
    amount?: number; // cents
    name?: string;
  }[];
};

export type CloverLooseLI = {
  name: string;
  price: number; // cents
  unitQty: string;
};

export interface CloverOrderPayload {
  order: {
    externalReferenceId: string;
    total: number; // cents
    state: "OPEN";
    note?: string;
  };
  lineItems: Array<CloverCatalogLI | CloverLooseLI>;
  tender?: {
    type: "CASH" | "CARD";
    amount: number; // cents
    currency: "USD";
  };
}

/* ─────────────────────── helpers ─────────────────────── */
const toCents = (d: number) => Math.round(d * 100);
const qtyStr = (q: number) => String(Math.round((q || 1) * 1000));

/* ─── selectedOption → Clover modification ─────────────── */
function choiceToMod(
  choice: {
    id: string;
    label: string;
    priceAdjustment?: number | null;
    cloverModifierId: string | null;
  },
  groupId?: string | null
) {
  if (!choice.cloverModifierId) return null;
  return {
    modifier: {
      id: choice.cloverModifierId,
      ...(groupId ? { modifierGroup: { id: groupId } } : {}),
    },
    name: choice.label,
    amount: toCents(choice.priceAdjustment ?? 0),
  };
}

/* ─────────────────── main mapper ──────────────────────── */
export function mapOrderToCloverPayload(
  order: Order & { paymentMethod: string; totalAmount: number },
  lineItems: Array<
    OrderLineItem & {
      unitPrice: number;
      selectedOptions?: any;
      menuItem: {
        cloverItemId: string | null;
        title: string | null;
        optionGroups?: (MenuItemOptionGroup & {
          cloverGroupId: string | null;
          choices: (MenuOptionChoice & {
            nestedOptionGroup?: {
              cloverGroupId: string | null;
              choices: NestedOptionChoice[];
            } | null;
          })[];
        })[];
      };
    }
  >,
  locationId: string,
  note?: string
): CloverOrderPayload {
  if (!locationId?.trim()) {
    throw new Error("mapOrderToCloverPayload: locationId is blank");
  }

  /* 1 – build order block --------------------------------------- */
  const payload: CloverOrderPayload = {
    order: {
      externalReferenceId: order.orderId,
      total: toCents(order.totalAmount),
      state: "OPEN",
      ...(note ? { note } : {}),
    },
    lineItems: [],
  };

  /* 2 – map each line item -------------------------------------- */
  payload.lineItems = lineItems.map((li) => {
    // ── catalogue item (synced to Clover) ───────────────────────
    if (li.menuItem.cloverItemId) {
      const mods: CloverCatalogLI["modifications"] = [];
      const sel = li.selectedOptions as any | undefined;
      const groups = li.menuItem.optionGroups ?? [];

      if (sel && groups.length) {
        for (const og of groups) {
          const ogSel = sel[og.id];
          if (!ogSel) continue;

          // top-level choices
          for (const ch of og.choices) {
            if (!ogSel.selectedChoiceIds?.includes(ch.id)) continue;
            const m = choiceToMod(ch, og.cloverGroupId);
            if (m) mods.push(m);

            // nested choices
            if (ch.nestedOptionGroup && ogSel.nestedSelections?.[ch.id]) {
              for (const nestChoice of ch.nestedOptionGroup.choices) {
                if (!ogSel.nestedSelections[ch.id].includes(nestChoice.id)) continue;
                const nm = choiceToMod(
                  nestChoice,
                  ch.nestedOptionGroup.cloverGroupId
                );
                if (nm) mods.push(nm);
              }
            }
          }
        }
      }

      const catalogItem: CloverCatalogLI = {
        item: { id: li.menuItem.cloverItemId },
        unitQty: qtyStr(li.quantity || 1),
        name: li.menuItem.title ?? "Item",
        price: toCents(li.unitPrice),
        ...(mods.length ? { modifications: mods } : {}),
      };
      return catalogItem;
    }

    // ── loose / custom item ────────────────────────────────────
    const looseItem: CloverLooseLI = {
      name: li.menuItem.title ?? "Item",
      price: toCents(li.unitPrice),
      unitQty: qtyStr(li.quantity || 1),
    };
    return looseItem;
  });

  /* 3 – attach tender for CASH orders ---------------------------- */
  if (order.paymentMethod === "CASH") {
    payload.tender = {
      type: "CASH",
      amount: toCents(order.totalAmount),
      currency: "USD",
    };
  }

  return payload;
}
