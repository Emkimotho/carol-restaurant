/* ======================================================================= */
/*  File: utils/calculateDeliveryFee.ts                                    */
/* ----------------------------------------------------------------------- */
/*  Pure function to compute delivery fees—shared by UI & API.             */
/* ======================================================================= */

export interface DeliveryCalculationParams {
  distance:                number; // miles
  travelTimeMinutes:       number; // minutes
  ratePerMile:             number; // $ / mile
  ratePerHour:             number; // $ / hour
  restaurantFeePercentage: number; // FRACTION  e.g. 0.10 for 10 %
  orderSubtotal:           number; // food/items only
  minimumCharge:           number; // absolute $
  freeDeliveryThreshold:   number; // subtotal level for free delivery
}

export interface DeliveryCalculationResult {
  totalFee:                number; // rawFee after min‑charge
  customerFee:             number; // what the customer pays
  freeDelivery:            boolean;
  additionalAmountForFree: number; // 0 if freeDelivery === true
  discountSaved?:          number; // present only when freeDelivery
}

/* ------------------------------------------------------------------ */
/*  calculateDeliveryFee()                                            */
/* ------------------------------------------------------------------ */
/**
 * Steps
 *  1. rawFee   = distance·ratePerMile + time·ratePerHour  (≥ minimumCharge)
 *  2. restaurantContribution = restaurantFeePercentage · orderSubtotal
 *  3. customerFee = max(rawFee – restaurantContribution, minimumCharge)
 *  4. Apply freeDeliveryThreshold logic
 */
export function calculateDeliveryFee(
  params: DeliveryCalculationParams
): DeliveryCalculationResult {
  const {
    distance,
    travelTimeMinutes,
    ratePerMile,
    ratePerHour,
    restaurantFeePercentage,
    orderSubtotal,
    minimumCharge,
    freeDeliveryThreshold,
  } = params;

  /* ---------- 1. raw distance+time fee ----------------------------- */
  let rawFee =
    distance * ratePerMile + (travelTimeMinutes / 60) * ratePerHour;
  if (rawFee < minimumCharge) rawFee = minimumCharge;

  /* ---------- 2. restaurant kicks‑in ------------------------------- */
  const restaurantContribution = restaurantFeePercentage * orderSubtotal;

  /* ---------- 3. customer pays ------------------------------------- */
  let customerFee = rawFee - restaurantContribution;
  if (customerFee < minimumCharge) customerFee = minimumCharge;

  /* ---------- 4. free‑delivery logic ------------------------------- */
  if (orderSubtotal >= freeDeliveryThreshold) {
    return {
      totalFee:                0,
      customerFee:             0,
      freeDelivery:            true,
      additionalAmountForFree: 0,
      discountSaved:           customerFee,
    };
  }

  const additionalAmountForFree = freeDeliveryThreshold - orderSubtotal;

  return {
    totalFee:                Math.round(rawFee * 100) / 100,
    customerFee:             Math.round(customerFee * 100) / 100,
    freeDelivery:            false,
    additionalAmountForFree: Math.round(additionalAmountForFree * 100) / 100,
  };
}
