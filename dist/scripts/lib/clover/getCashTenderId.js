"use strict";
// File: lib/clover/getCashTenderId.ts
// -----------------------------------------------------------------------------
// Helper to fetch (and cache in-memory) the Clover CASH tender ID for a given
// Clover order. Avoids repeated network calls for the same order in a single
// process instance.
// -----------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCashTenderId = getCashTenderId;
const cloverClient_1 = require("@/lib/cloverClient");
const { merchantId } = (0, cloverClient_1.getCloverConfig)();
// In-memory cache: cloverOrderId → cashTenderId
const tenderCache = new Map();
/**
 * Retrieve the Clover tender ID for the CASH tender on a given Clover order.
 * Caches the result in-process to avoid duplicate API calls.
 *
 * @param cloverOrderId — Clover’s internal order ID (e.g. “YS5ZSM5RXX1EW”)
 * @returns the tender ID if found, or null if no CASH tender exists
 */
async function getCashTenderId(cloverOrderId) {
    if (!cloverOrderId) {
        throw new Error("getCashTenderId: missing cloverOrderId");
    }
    // 1) Check cache
    if (tenderCache.has(cloverOrderId)) {
        return tenderCache.get(cloverOrderId);
    }
    // 2) Fetch tenders for this Clover order
    let resp;
    try {
        resp = await (0, cloverClient_1.cloverFetch)(`/v3/merchants/${merchantId}/orders/${cloverOrderId}/tenders`, {
            method: "GET",
        });
    }
    catch (err) {
        console.error(`getCashTenderId: error fetching tenders for order ${cloverOrderId}:`, err);
        throw err;
    }
    // 3) Find the CASH tender
    const cashTender = resp.elements.find((t) => t.type === "CASH");
    if (!cashTender) {
        // If you expect to create a tender soon, avoid caching null so that
        // subsequent calls will re-fetch and catch the newly-created tender.
        return null;
    }
    // 4) Cache and return
    tenderCache.set(cloverOrderId, cashTender.id);
    return cashTender.id;
}
