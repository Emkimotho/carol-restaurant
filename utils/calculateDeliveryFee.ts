// File: utils/calculateDeliveryFee.ts

export interface DeliveryCalculationParams {
  distance: number;
  travelTimeMinutes: number;
  ratePerMile: number;
  ratePerHour: number;
  restaurantFeePercentage: number;
  orderSubtotal: number; // cost of items only
  minimumCharge: number;
  freeDeliveryThreshold: number;
}

export interface DeliveryCalculationResult {
  totalFee: number;
  customerFee: number;
  freeDelivery: boolean;
  additionalAmountForFree: number;
  discountSaved?: number; // how much user saved if free
}

export function calculateDeliveryFee(
  params: DeliveryCalculationParams
): DeliveryCalculationResult {
  console.log("[calculateDeliveryFee] Received params:", params);

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

  // 1) Compute raw fee from distance/time
  let distanceFee = distance * ratePerMile;
  let timeFee = (travelTimeMinutes / 60) * ratePerHour;
  let computedFee = distanceFee + timeFee;
  console.log("[calculateDeliveryFee] Base computedFee =", computedFee);

  // Enforce minimum charge
  if (computedFee < minimumCharge) {
    computedFee = minimumCharge;
    console.log("[calculateDeliveryFee] Enforced min charge, computedFee =", computedFee);
  }

  // 2) Subtract restaurant’s share
  const restaurantContribution = orderSubtotal * restaurantFeePercentage;
  let customerFee = computedFee - restaurantContribution;
  console.log("[calculateDeliveryFee] After restaurant contribution, customerFee =", customerFee);

  // Still ensure the customer's portion is at least the minimum
  if (customerFee < minimumCharge) {
    customerFee = minimumCharge;
    console.log("[calculateDeliveryFee] Enforced min charge on customerFee =", customerFee);
  }

  // 3) Check freeDeliveryThreshold
  if (orderSubtotal >= freeDeliveryThreshold) {
    console.log("[calculateDeliveryFee] Subtotal >= threshold => FREE DELIVERY!");
    return {
      totalFee: 0,
      customerFee: 0,
      freeDelivery: true,
      additionalAmountForFree: 0,
      discountSaved: customerFee, // user effectively saves what they'd have paid
    };
  }

  // 4) If not free, how much more needed?
  const additionalAmountForFree = freeDeliveryThreshold - orderSubtotal;
  console.log("[calculateDeliveryFee] Not free. additionalAmountForFree =", additionalAmountForFree);

  return {
    totalFee: computedFee,
    customerFee,
    freeDelivery: false,
    additionalAmountForFree,
  };
}
