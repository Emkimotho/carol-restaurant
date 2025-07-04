// File: utils/getDeliveryLabel.ts
import type { DeliveryType } from "@prisma/client";

/**
 * DeliveryType  (+ optional holeNumber) → human-readable label
 *
 * •  PICKUP_AT_CLUBHOUSE → “Clubhouse Pick-up”
 * •  ON_COURSE           → “On-Course • Hole N”
 * •  EVENT_PAVILION      → “Event Pavilion”
 * •  DELIVERY            → “Home Delivery”
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
      return "Clubhouse Pick-up";
  }
}
