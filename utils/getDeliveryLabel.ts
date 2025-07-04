// File: utils/getDeliveryLabel.ts
import type { DeliveryType } from "@prisma/client";

/**
 * Turns a DeliveryType enum value (plus optional hole number)
 * into human-readable text for receipts, confirmations, dashboards, etc.
 *
 *  • PICKUP_AT_CLUBHOUSE → “Restaurant Pick-up”
 *  • ON_COURSE          → “On-Course • Hole N”
 *  • EVENT_PAVILION     → “Event Pavilion”
 *  • DELIVERY           → “Home Delivery”
 */
export function getDeliveryLabel(
  deliveryType: DeliveryType,
  holeNumber?: number | null
): string {
  switch (deliveryType) {
    case "ON_COURSE":
      return `On-Course • Hole ${holeNumber ?? "—"}`;
    case "EVENT_PAVILION":
      return "Event Pavilion";
    case "DELIVERY":
      return "Home Delivery";
    case "PICKUP_AT_CLUBHOUSE":
    default:
      return "Restaurant Pick-up";
  }
}
