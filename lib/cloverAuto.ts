// File: lib/clover/cloverAuto.ts

import { cloverFetch } from "./cloverClient";

/**
 * Try a V3 path first; if that returns 404/501 or “Not Implemented,”
 * automatically retry using the V2 path.
 *
 * @param pathV3   The V3 endpoint (e.g., "/v3/merchants/{mId}/items")
 * @param pathV2   The V2 endpoint (e.g., "/v2/merchant/{mId}/items")
 * @param options  RequestInit (method, headers, body, etc.)
 */
export async function cloverFetchAuto<T = any>(
  pathV3: string,
  pathV2: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // First try V3
    return await cloverFetch(pathV3, options);
  } catch (err: any) {
    const msg = String(err.message || "");
    // If the error looks like V3 isn’t enabled, fall back to V2
    if (
      msg.includes("404") ||
      msg.includes("Not Implemented") ||
      msg.includes("501")
    ) {
      return await cloverFetch(pathV2, options);
    }
    // Otherwise rethrow
    throw err;
  }
}
