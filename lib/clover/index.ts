// File: lib/clover/index.ts
// ─────────────────────────────────────────────────────────────────────
// Central exports for all Clover-related functionality and types.
// ─────────────────────────────────────────────────────────────────────

// 1) Re-export the low-level client helpers (unchanged)
export { getCloverConfig, cloverFetch } from "../cloverClient";

// 2) Re-export the menu-sync helpers (unchanged)
export { syncAllMenuItems, syncOne } from "./menuService";

// 3) Re-export the payment-session helper AND its CartItem type.
//    Because "isolatedModules" is on, we must use `export type` for interfaces.
export type { CartItem } from "./paymentService";
export { createCloverPaymentSession } from "./paymentService";
