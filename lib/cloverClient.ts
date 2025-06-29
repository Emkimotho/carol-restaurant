// File: lib/cloverClient.ts
// ------------------------------------------------------------------
// • Central Clover helper: environment config, generic fetch wrapper,
//   convenience helpers for inventory sync and catalog fetch.
// • Fails fast if required env vars are missing.
// • Strips debug logs in production for cleaner logs.
// ------------------------------------------------------------------

import { createHmac, timingSafeEqual } from "crypto";

export interface CloverConfig {
  baseUrl:    string;
  merchantId: string;
  /** Public OAuth / sandbox token */
  token:      string;
  /** Private‐eCom token – required for catalog fetch */
  privToken?: string;
}

let _cachedConfig: CloverConfig | null = null;

/**
 * Load and validate all Clover configuration from env.
 * Memoized so it's only done once per lambda cold start.
 */
export function getCloverConfig(): CloverConfig {
  if (_cachedConfig) {
    return _cachedConfig;
  }

  const isProd = process.env.NODE_ENV === "production";
  let baseUrl: string | undefined,
      merchantId: string | undefined,
      token: string | undefined,
      privToken: string | undefined;

  if (isProd) {
    baseUrl    = process.env.CLOVER_BASE_URL_PROD?.trim();
    merchantId = process.env.CLOVER_MERCHANT_ID_PROD?.trim();
    token      = process.env.CLOVER_API_TOKEN_PROD?.trim();
    privToken  = process.env.CLOVER_PRIVATE_ECOM_TOKEN_PROD?.trim();

    if (!baseUrl) {
      throw new Error('Missing or empty env var "CLOVER_BASE_URL_PROD"');
    }
    if (!merchantId) {
      throw new Error('Missing or empty env var "CLOVER_MERCHANT_ID_PROD"');
    }
    if (!token) {
      throw new Error('Missing or empty env var "CLOVER_API_TOKEN_PROD"');
    }
  } else {
    baseUrl =
      process.env.CLOVER_BASE_URL_SANDBOX?.trim() ||
      process.env.CLOVER_BASE_URL?.trim() ||
      "https://apisandbox.dev.clover.com";
    merchantId =
      process.env.CLOVER_MERCHANT_ID_SANDBOX?.trim() ||
      process.env.CLOVER_MERCHANT_ID?.trim();
    token =
      process.env.CLOVER_API_TOKEN_SANDBOX?.trim() ||
      process.env.CLOVER_API_TOKEN?.trim();
    privToken =
      process.env.CLOVER_PRIVATE_ECOM_TOKEN_SANDBOX?.trim() ||
      process.env.CLOVER_PRIVATE_ECOM_TOKEN?.trim();

    if (!baseUrl) {
      throw new Error('Missing or empty env var "CLOVER_BASE_URL_SANDBOX" or "CLOVER_BASE_URL"');
    }
    if (!merchantId) {
      throw new Error('Missing or empty env var "CLOVER_MERCHANT_ID_SANDBOX" or "CLOVER_MERCHANT_ID"');
    }
    if (!token) {
      throw new Error('Missing or empty env var "CLOVER_API_TOKEN_SANDBOX" or "CLOVER_API_TOKEN"');
    }
  }

  _cachedConfig = { baseUrl, merchantId, token, privToken };
  return _cachedConfig;
}

/**
 * Generic fetch wrapper for Clover API requests.
 * - Injects Authorization header.
 * - Retries v2 endpoint on v3 404s.
 * - Parses JSON safely.
 * - Throws on non-OK status.
 */
export async function cloverFetch<T = any>(
  path:    string,
  options: RequestInit = {}
): Promise<T> {
  const { baseUrl, token } = getCloverConfig();
  const url  = `${baseUrl}${path}`;
  const method = (options.method || "GET").toUpperCase();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept":       "application/json",
    "Authorization": `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  // Debug logging only in non-production
  if (process.env.NODE_ENV !== "production") {
    console.log("[Clover Request]", method, url, "Payload:", options.body ?? "<no body>");
  }

  let response = await fetch(url, { ...options, headers });

  // v3 → v2 fallback for merchant‐scoped endpoints
  if (response.status === 404 && path.startsWith("/v3/merchants/")) {
    const fallback = path.replace(/^\/v3\/merchants\//, "/v2/merchants/");
    const v2Url    = `${baseUrl}${fallback}`;
    if (process.env.NODE_ENV !== "production") {
      console.log("[Clover Fallback] retrying v2 endpoint:", method, v2Url);
    }
    response = await fetch(v2Url, { ...options, headers });
  }

  // No content
  if (response.status === 204) {
    return {} as T;
  }

  // Safely parse JSON
  const text = await response.text();
  let data: T;
  try {
    data = text ? JSON.parse(text) : ({} as T);
  } catch {
    data = ({} as T);
  }

  if (!response.ok) {
    throw new Error(
      `Clover API Error [${response.status} ${response.statusText}]: ${JSON.stringify(data)}`
    );
  }

  return data;
}

/**
 * Push a new stock level for a Clover item.
 */
export async function pushStockToClover(
  cloverItemId: string,
  newQuantity:  number
) {
  const { merchantId } = getCloverConfig();
  await cloverFetch(
    `/v3/merchants/${merchantId}/item_stocks/${cloverItemId}`,
    {
      method: "POST",
      body:   JSON.stringify({ quantity: newQuantity }),
    }
  );
}

/**
 * Fetch your full catalog from Clover (v3 → v2 fallback).
 * Requires your private eCom token in config. Throws if missing.
 */
export interface CloverCatalogItem {
  id:      string;
  name:    string;
  price:   number;
  taxable: boolean;
}

export async function fetchCloverItems(): Promise<CloverCatalogItem[]> {
  const { baseUrl, merchantId, privToken } = getCloverConfig();
  if (!privToken) {
    throw new Error("Missing CLOVER_PRIVATE_ECOM_TOKEN for catalog fetch.");
  }

  const v3Path = `/v3/merchants/${merchantId}/items`;
  const headers = {
    "Accept":        "application/json",
    "Authorization": `Bearer ${privToken}`
  };

  if (process.env.NODE_ENV !== "production") {
    console.log("[Clover Catalog Request] GET", `${baseUrl}${v3Path}`);
  }

  let response = await fetch(`${baseUrl}${v3Path}`, { headers });

  if (response.status === 404) {
    const v2Path = `/v2/merchants/${merchantId}/items`;
    if (process.env.NODE_ENV !== "production") {
      console.log("[Clover Catalog Fallback] retrying v2:", `${baseUrl}${v2Path}`);
    }
    response = await fetch(`${baseUrl}${v2Path}`, { headers });
  }

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(
      `Clover Catalog Error [${response.status} ${response.statusText}]: ${txt}`
    );
  }

  const payload: { elements?: any[]; items?: any[] } = await response.json();
  const rawItems = payload.elements ?? payload.items ?? [];

  return rawItems.map(it => ({
    id:      String(it.id),
    name:    String(it.name),
    price:   Number(it.price)   || 0,
    taxable: Boolean(it.taxable) || false,
  }));
}

/**
 * Verify an incoming Clover webhook via HMAC‐SHA256.
 */
export function verifyCloverSignature(
  payload:   string,
  signature: string
): boolean {
  const secret = process.env.CLOVER_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[CloverClient] Missing CLOVER_WEBHOOK_SECRET");
    return false;
  }
  const hmac = createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("base64");

  const sigBuf  = Buffer.from(signature, "base64");
  const hmacBuf = Buffer.from(hmac,    "base64");
  if (sigBuf.length !== hmacBuf.length) {
    return false;
  }
  return timingSafeEqual(sigBuf, hmacBuf);
}
