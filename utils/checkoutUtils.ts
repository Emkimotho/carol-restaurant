/* ======================================================================= */
/*  File: utils/checkoutUtils.ts                                           */
/* ----------------------------------------------------------------------- */
/*  General helpers for phone‑formatting plus tip / tax / total utilities. */
/* ======================================================================= */

/**
 * Formats a phone number into (XXX) XXX‑XXXX format.
 *
 * @param value - The raw phone number string.
 * @returns The formatted phone number.
 */
export const formatPhoneNumber = (value: string): string => {
  if (!value) return value;
  const digitsOnly = value.replace(/[^\d]/g, "");
  const length = digitsOnly.length;

  if (length < 4) return digitsOnly;
  if (length < 7) {
    return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
  }
  return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(
    3,
    6
  )}-${digitsOnly.slice(6, 10)}`;
};

/**
 * Validates that the phone number matches the (XXX) XXX‑XXXX format.
 *
 * @param phone - The phone number string to validate.
 * @returns True if valid; otherwise, false.
 */
export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
  return phoneRegex.test(phone);
};

/* ---------- internal helper to avoid JS‑float surprises ------------- */
const roundTwo = (n: number): number => Math.round(n * 100) / 100;

/**
 * Calculates the tip amount based on the subtotal.
 *
 * @param total     - The subtotal amount.
 * @param tip       - The tip percentage as a string, or "custom" for a custom tip.
 * @param customTip - The custom tip amount as a string, used when tip === "custom".
 * @returns The calculated tip amount.
 */
export const calculateTipAmount = (
  total: number,
  tip: string,
  customTip: string
): number => {
  if (tip === "custom") {
    return roundTwo(parseFloat(customTip) || 0);
  }
  return roundTwo(total * (parseFloat(tip) / 100));
};

/**
 * Calculates the tax amount based on the subtotal and tax rate.
 *
 * @param total   - The subtotal amount.
 * @param taxRate - The tax rate (e.g., 0.07 for 7 %).
 * @returns The calculated tax amount.
 */
export const calculateTaxAmount = (total: number, taxRate: number): number =>
  roundTwo(total * taxRate);

/**
 * Calculates the final total including tip, tax, and delivery fee.
 *
 * @param subtotal     - The subtotal amount.
 * @param tipAmount    - The calculated tip amount.
 * @param taxAmount    - The calculated tax amount.
 * @param deliveryFee  - The delivery fee amount.
 * @returns The final total **stringified to two decimals** (e.g., "25.50").
 */
export const calculateTotalWithTipAndTax = (
  subtotal: number,
  tipAmount: number,
  taxAmount: number,
  deliveryFee: number
): string => {
  const finalTotal = subtotal + tipAmount + taxAmount + deliveryFee;
  return roundTwo(finalTotal).toFixed(2);
};
