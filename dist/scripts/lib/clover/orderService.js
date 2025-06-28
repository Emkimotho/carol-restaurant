"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushOrderToClover = pushOrderToClover;
exports.ensureCashTender = ensureCashTender;
const client_1 = require("@prisma/client");
const cloverClient_1 = require("@/lib/cloverClient");
const orderMapper_1 = require("@/lib/clover/orderMapper");
const getLocationId_1 = require("@/lib/clover/getLocationId");
const getCashTenderId_1 = require("./getCashTenderId");
const prisma = new client_1.PrismaClient();
const { merchantId } = (0, cloverClient_1.getCloverConfig)();
/**
 * Push a local order to Clover Orders API, and return the internal Clover order ID.
 * If order already has cloverOrderId in DB, returns that immediately.
 *
 * @param localOrderId – our local Order.id (UUID)
 * @returns the internal Clover order ID (string)
 */
async function pushOrderToClover(localOrderId) {
    // 1. Load order + necessary relations from DB
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
    let rows = order.lineItems;
    if (rows.length === 0 && Array.isArray(order.items)) {
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
    // 4. Compose note & payload
    const flags = [];
    if (order.containsAlcohol)
        flags.push("Contains alcohol");
    if (order.orderType?.toLowerCase() === "golf")
        flags.push("Golf order");
    const note = [order.orderId, ...flags].join(" · ");
    // 5. Get Clover location ID
    const locationId = await (0, getLocationId_1.getLocationId)();
    // 6. Map to Clover payload
    //    Ensure mapOrderToCloverPayload returns an object like:
    //    { order: {...}, lineItems: [...], tender?: {...} }
    const payload = (0, orderMapper_1.mapOrderToCloverPayload)(order, rows, locationId, note);
    // 7. Create empty Clover order
    const { id: cloverOrderId } = await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders`, {
        method: "POST",
        body: JSON.stringify({ order: payload.order }),
    });
    // 8. Bulk line items
    const bulkItems = payload.lineItems.map((li) => {
        // li: likely has shape with either `item` field or direct fields
        const liAny = li;
        // Determine unitQty (thousandths)
        const unitQty = parseInt(liAny.unitQty, 10) || 0;
        // Determine priceCents:
        // If liAny.item exists, use the row's menuItem.price if present
        let priceCents = 0;
        if (liAny.item) {
            // Find corresponding row by index? Here we assume mapping in same order as rows array
            // But since we don't have index here, we might rely on payload providing price or row reference.
            // If your mapOrderToCloverPayload attaches price info in liAny, use that.
            if (liAny.priceCents != null) {
                priceCents = Number(liAny.priceCents);
            }
            else {
                // fallback: no direct priceCents on liAny; you may pass row along in payload or reconstruct:
                // Here we set 0 or throw if missing: adjust as needed
                console.warn("pushOrderToClover: no priceCents in lineItem payload; defaulting to 0");
                priceCents = 0;
            }
        }
        else {
            // Non-item rows (e.g., custom), check `unitPrice` if provided
            if (liAny.unitPrice != null) {
                priceCents = Math.round(Number(liAny.unitPrice) * 100);
            }
            else if (liAny.price != null) {
                priceCents = Math.round(Number(liAny.price) * 100);
            }
            else {
                console.warn("pushOrderToClover: lineItem missing unitPrice/price; defaulting to 0");
                priceCents = 0;
            }
        }
        // Determine name
        let name = "Item";
        if (liAny.name) {
            name = liAny.name;
        }
        else if (liAny.item && liAny.item.title) {
            name = liAny.item.title;
        }
        const base = {
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
    if (order.customerDeliveryFee) {
        bulkItems.push({
            name: "Delivery Fee",
            price: Math.round(order.customerDeliveryFee * 100),
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
    const bulkRes = await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders/${cloverOrderId}/bulk_line_items`, { method: "POST", body: JSON.stringify({ items: bulkItems }) });
    // 9. Attach modifiers if any
    // We assume payload.lineItems[i].modifications corresponds to bulkRes[i]
    for (let i = 0; i < payload.lineItems.length; i++) {
        const liAny = payload.lineItems[i];
        const mods = liAny.modifications;
        const lineRes = bulkRes[i];
        if (mods && lineRes && lineRes.id) {
            for (const m of mods) {
                await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders/${cloverOrderId}/line_items/${lineRes.id}/modifications`, { method: "POST", body: JSON.stringify({ modifier: { id: m.modifier.id } }) });
            }
        }
    }
    // 10. Attach tender if non-CASH
    if (payload.tender && order.paymentMethod !== "CASH") {
        await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders/${cloverOrderId}/tenders`, { method: "POST", body: JSON.stringify({ tender: payload.tender }) });
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
async function ensureCashTender(cloverOrderId, amount) {
    if (!cloverOrderId) {
        throw new Error("ensureCashTender: missing cloverOrderId");
    }
    // Round to cents
    const cents = Math.round(amount * 100);
    // 1) Check if a CASH tender already exists
    let existingTenderId;
    try {
        existingTenderId = await (0, getCashTenderId_1.getCashTenderId)(cloverOrderId);
    }
    catch (err) {
        console.error(`ensureCashTender: error checking existing tender for order ${cloverOrderId}:`, err);
        throw err;
    }
    if (existingTenderId) {
        // Already has a CASH tender; do nothing
        return;
    }
    // 2) Create the CASH tender
    try {
        const body = JSON.stringify({
            tender: {
                type: "CASH",
                amount: cents,
                currency: "USD",
            },
        });
        await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders/${cloverOrderId}/tenders`, {
            method: "POST",
            body,
        });
    }
    catch (err) {
        const msg = err?.message || "";
        // If Clover returns 409 conflict, ignore
        if (msg.includes("409")) {
            console.warn(`ensureCashTender: conflict creating CASH tender for order ${cloverOrderId}, assuming already exists`);
            return;
        }
        console.error(`ensureCashTender: error creating tender for ${cloverOrderId}:`, err);
        throw err;
    }
}
