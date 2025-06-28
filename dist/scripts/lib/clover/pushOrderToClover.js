"use strict";
// -----------------------------------------------------------------------------
// Push ONE local order to Clover Orders API.
//
// • Sends externalReferenceId + note so staff see “ORD-… · flags”.
// • Adds source { type:"ONLINE", sourceText:"19th Web" }.
// • Uses /bulk_line_items (unitQty thousandths; 1000 = 1.000).
// • Delivery-fee & Tip are loose, non-taxable rows.
// -----------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushOrderToClover = pushOrderToClover;
const client_1 = require("@prisma/client");
const cloverClient_1 = require("@/lib/cloverClient");
const orderMapper_1 = require("@/lib/clover/orderMapper");
const getLocationId_1 = require("@/lib/clover/getLocationId");
const prisma = new client_1.PrismaClient();
const { merchantId } = (0, cloverClient_1.getCloverConfig)();
/* helper: strip null / undefined */
const stripNulls = (o) => JSON.parse(JSON.stringify(o));
async function pushOrderToClover(localOrderId) {
    /* ── 1. Load order + relations ──────────────────────────────────── */
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
    if (!order)
        throw new Error(`Order ${localOrderId} not found`);
    if (order.cloverOrderId)
        return order.cloverOrderId; // already synced
    /* ── 2. Build flat rows if legacy JSON exists ──────────────────── */
    let rows = order.lineItems;
    if (rows.length === 0 && order.items) {
        rows = order.items.map((j) => ({
            quantity: j.quantity ?? 1,
            unitPrice: j.price,
            selectedOptions: j.selectedOptions ?? undefined,
            menuItem: {
                cloverItemId: j.cloverItemId ?? null,
                title: j.title ?? "Item",
                optionGroups: [],
            },
        }));
    }
    /* ── 3. Compose note & payload ─────────────────────────────────── */
    const flags = [];
    if (order.containsAlcohol)
        flags.push("Contains alcohol");
    if (order.orderType?.toLowerCase() === "golf")
        flags.push("Golf order");
    const note = [order.orderId, ...flags].join(" · ");
    const locationId = await (0, getLocationId_1.getLocationId)();
    const payload = (0, orderMapper_1.mapOrderToCloverPayload)(order, rows, locationId, note);
    /* 3a – source descriptor */
    payload.order.source = {
        type: "ONLINE",
        sourceText: "19th Web",
    };
    /* ── 4. Create empty Clover order ──────────────────────────────── */
    const { id: cloverOrderId } = await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders`, { method: "POST", body: JSON.stringify({ order: payload.order }) });
    /* ── 5. Build /bulk_line_items ----------------------------------- */
    const bulkItems = payload.lineItems.map((li, idx) => {
        const row = rows[idx];
        const unitQty = parseInt(li.unitQty, 10); // thousandths
        const priceCents = "item" in li
            ? Math.round(row.menuItem.price * 100)
            : Math.round(row.unitPrice * 100);
        const name = "name" in li ? li.name : row.menuItem.title ?? "Item";
        return stripNulls({
            name,
            price: priceCents,
            unitQty,
            ...("item" in li
                ? { item: li.item, taxable: true }
                : { taxable: false }),
        });
    });
    /* 5a – delivery fee */
    if (order.customerDeliveryFee) {
        bulkItems.push({
            name: "Delivery Fee",
            price: Math.round(order.customerDeliveryFee * 100),
            unitQty: 1000,
            taxable: false,
        });
    }
    /* 5b – tip */
    if (order.tipAmount) {
        bulkItems.push({
            name: "Tip",
            price: Math.round(order.tipAmount * 100),
            unitQty: 1000,
            taxable: false,
        });
    }
    /* 5c – POST bulk_line_items */
    const bulkRes = await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders/${cloverOrderId}/bulk_line_items`, { method: "POST", body: JSON.stringify({ items: bulkItems }) });
    /* ── 6. Attach modifiers ----------------------------------------- */
    for (let i = 0; i < rows.length; i++) {
        const mods = payload.lineItems[i].modifications;
        if (!mods?.length)
            continue;
        const lineId = bulkRes[i].id; // same index
        for (const m of mods) {
            await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders/${cloverOrderId}/line_items/${lineId}/modifications`, { method: "POST", body: JSON.stringify({ modifier: { id: m.modifier.id } }) });
        }
    }
    /* ── 7. Attach tender (skip for CASH) ----------------------------- */
    if (payload.tender && order.paymentMethod !== "CASH") {
        await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders/${cloverOrderId}/tenders`, { method: "POST", body: JSON.stringify({ tender: payload.tender }) });
    }
    /* ── 8. Persist linkage ------------------------------------------ */
    await prisma.order.update({
        where: { id: localOrderId },
        data: { cloverOrderId, cloverLastSyncAt: new Date() },
    });
    return cloverOrderId;
}
