// File: lib/clover/index.ts

// 1) Re-export the low-level client helpers
export { getCloverConfig, cloverFetch } from "@/lib/cloverClient";
// ➤ Location helpers
export { getLocationId, updateLocationId } from "@/lib/clover/getLocationId";

// 2) Order-sync helpers
export { mapOrderToCloverPayload }             from "@/lib/clover/orderMapper";
export { pushOrderToClover }                   from "@/lib/clover/pushOrderToClover";
export { handleOrderWebhook, STATE_MAP }       from "@/lib/clover/handleOrderWebhook";

// 3) Menu-sync helpers
export { syncAllMenuItems, syncOne }           from "@/lib/clover/menuService";

// 4) Payment-session helper + type
export type { CartItem }                       from "@/lib/clover/paymentService";
export { createCloverPaymentSession }          from "@/lib/clover/paymentService";
