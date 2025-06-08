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
  restaurantFeePercentage: number; // FRACTION e.g. 0.10 for 10 %
  orderSubtotal:           number; // food/items only
  minimumCharge:           number; // absolute $
  freeDeliveryThreshold:   number; // subtotal level for free delivery
}

export interface DeliveryCalculationResult {
  totalFee:                number; // what driver earns (distance/time, floored to minimum, plus any extra if subsidy > raw)
  customerFee:             number; // what the customer pays
  freeDelivery:            boolean;
  additionalAmountForFree: number; // how much more to reach free
  discountSaved?:          number; // only present when freeDelivery
}

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

  // 1. Free-delivery if subtotal high enough
  if (orderSubtotal >= freeDeliveryThreshold) {
    const raw =
      distance * ratePerMile + (travelTimeMinutes / 60) * ratePerHour;
    return {
      totalFee:                0,
      customerFee:             0,
      freeDelivery:            true,
      additionalAmountForFree: 0,
      discountSaved:           Math.round(raw * 100) / 100,
    };
  }

  // 2. Compute raw distance+time fee, floored to minimumCharge
  let rawFee =
    distance * ratePerMile + (travelTimeMinutes / 60) * ratePerHour;
  if (rawFee < minimumCharge) {
    rawFee = minimumCharge;
  }

  // 3. Restaurant subsidy based on subtotal
  const restaurantContribution = restaurantFeePercentage * orderSubtotal;

  // 4. Decide final fees:
  //    - If subsidy > rawFee, then customer still pays the minimumCharge,
  //      and driver gets minimumCharge + subsidy.
  //    - Otherwise, customer pays rawFee minus subsidy, driver gets rawFee.
  let totalFee: number;
  let customerFee: number;

  if (restaurantContribution > rawFee) {
    customerFee = minimumCharge;
    totalFee    = minimumCharge + restaurantContribution;
  } else {
    customerFee = rawFee - restaurantContribution;
    totalFee    = rawFee;
  }

  return {
    totalFee:                Math.round(totalFee * 100) / 100,
    customerFee:             Math.round(customerFee * 100) / 100,
    freeDelivery:            false,
    additionalAmountForFree: Math.round((freeDeliveryThreshold - orderSubtotal) * 100) / 100,
  };
}
