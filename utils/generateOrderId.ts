// File: utils/generateOrderId.ts
import { v4 as uuidv4 } from "uuid";

export function generateOrderId(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // e.g. "20250406"
  const randomPart = uuidv4().split("-")[0].toUpperCase(); // e.g. "AB12CD34"
  return `ORD-${datePart}-${randomPart}`;
}
