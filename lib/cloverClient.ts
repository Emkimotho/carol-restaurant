// File: lib/cloverClient.ts
// ------------------------------------------------------------------
// • Central Clover helper: environment config, generic fetch wrapper,
//   convenience helpers for inventory sync and catalog fetch.
// • Logs every outbound request (method, URL, and payload)
//   so you can pinpoint exactly what is being sent to Clover.
// ------------------------------------------------------------------

import { createHmac, timingSafeEqual } from "crypto";

/** Your main Clover config object */
export interface CloverConfig {
  baseUrl:    string;
  merchantId: string;
  /** Public OAuth / sandbox token */
  token:      string;
  /** Private-eCom token – required only for fetchCloverItems */
  privToken?: string;
}

/* ───────────────────────  Env → Config  ─────────────────────── */

export function getCloverConfig(): CloverConfig {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!process.env.CLOVER_BASE_URL_PROD?.trim()) {
      throw new Error('Missing or invalid "CLOVER_BASE_URL_PROD".');
    }
    if (!process.env.CLOVER_MERCHANT_ID_PROD?.trim()) {
      throw new Error('Missing or invalid "CLOVER_MERCHANT_ID_PROD".');
    }
    if (!process.env.CLOVER_API_TOKEN_PROD?.trim()) {
      throw new Error('Missing or invalid "CLOVER_API_TOKEN_PROD".');
    }

    return {
      baseUrl:    process.env.CLOVER_BASE_URL_PROD.trim(),
      merchantId: process.env.CLOVER_MERCHANT_ID_PROD.trim(),
      token:      process.env.CLOVER_API_TOKEN_PROD.trim(),
      privToken:  process.env.CLOVER_PRIVATE_ECOM_TOKEN_PROD?.trim(),
    };
  }

  /* development / sandbox */
  const baseUrl =
    process.env.CLOVER_BASE_URL?.trim()
    || process.env.CLOVER_BASE_URL_SANDBOX?.trim()
    || "https://apisandbox.dev.clover.com";

  const merchantId =
    process.env.CLOVER_MERCHANT_ID?.trim()
    || process.env.CLOVER_MERCHANT_ID_SANDBOX?.trim();

  const token =
    process.env.CLOVER_API_TOKEN?.trim()
    || process.env.CLOVER_API_TOKEN_SANDBOX?.trim();

  if (!merchantId) throw new Error('Missing "CLOVER_MERCHANT_ID".');
  if (!token)      throw new Error('Missing "CLOVER_API_TOKEN".');

  return {
    baseUrl,
    merchantId,
    token,
    privToken:
      process.env.CLOVER_PRIVATE_ECOM_TOKEN?.trim()
      || process.env.CLOVER_PRIVATE_ECOM_TOKEN_SANDBOX?.trim(),
  };
}

/* ─────────────────────────  Generic fetch  ───────────────────────── */

export async function cloverFetch<T = any>(
  path:    string,
  options: RequestInit = {},
): Promise<T> {
  const { baseUrl, token } = getCloverConfig();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept:         "application/json",
    Authorization:  `Bearer ${token}`,
    ...(options.headers as Record<string, string> | undefined),
  };

  const method = (options.method || "GET").toUpperCase();
  console.log("[Clover Request]", method, url, "Payload:", options.body ?? "<no body>");

  let response = await fetch(url, { ...options, headers });

  // 404 fallback v3 → v2
  if (response.status === 404 && path.startsWith("/v3/merchants/")) {
    const fallback = path.replace(/^\/v3\/merchants\//, "/v2/merchants/");
    const v2Url    = `${baseUrl}${fallback}`;
    console.log("[Clover Fallback] 404 from v3, retrying v2:", method, v2Url);
    response = await fetch(v2Url, { ...options, headers });
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text   = await response.text();
  const isJSON = response.headers.get("content-type")?.includes("application/json");
  const data   = isJSON && text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(
      `Clover API Error [${response.status} ${response.statusText}]: ${JSON.stringify(data)}`
    );
  }

  return data as T;
}

/* ────────────────────────  Inventory helper  ─────────────────────── */

 /**
  * Pushes a new stock level for a single Clover item.
  * @param cloverItemId the Clover item’s UUID
  * @param newQuantity  the exact quantity to set
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

/* ─────────────────────────  Catalog helper  ───────────────────────── */

export interface CloverCatalogItem {
  id:      string;
  name:    string;
  price:   number;
  taxable: boolean;
}

/**
 * Fetches your full catalog from Clover (v3→v2 fallback).
 * Requires your private eCom token (`privToken` in config).
 */
export async function fetchCloverItems(): Promise<CloverCatalogItem[]> {
  const { baseUrl, merchantId, privToken } = getCloverConfig();
  if (!privToken) {
    throw new Error("Missing CLOVER_PRIVATE_ECOM_TOKEN for catalog fetch.");
  }

  const v3Url = `${baseUrl}/v3/merchants/${merchantId}/items`;
  console.log("[Clover Catalog Request] GET", v3Url);

  let response = await fetch(v3Url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${privToken}` },
  });

  if (response.status === 404) {
    const v2Url = `${baseUrl}/v2/merchants/${merchantId}/items`;
    console.log("[Clover Catalog Fallback] v3 404, retry v2:", v2Url);
    response = await fetch(v2Url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${privToken}` },
    });
  }

  if (!response.ok) {
    throw new Error(
      `Clover Catalog Error [${response.status} ${response.statusText}]: ${await response.text()}`
    );
  }

  const payload: { elements?: any[]; items?: any[] } = await response.json();
  const rawItems = payload.elements ?? payload.items ?? [];

  return rawItems.map(it => ({
    id:      String(it.id),
    name:    String(it.name),
    price:   Number(it.price) || 0,
    taxable: Boolean(it.taxable),
  }));
}

/* ───────────────────  Webhook signature helper  ─────────────────── */

/**
 * Verifies an incoming Clover webhook using HMAC‐SHA256 with your secret.
 * @param payload   raw request body (string)
 * @param signature value of the X-Clover-Signature header
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
  const hmacBuf = Buffer.from(hmac, "base64");
  if (sigBuf.length !== hmacBuf.length) {
    return false;
  }
  return timingSafeEqual(sigBuf, hmacBuf);
}
