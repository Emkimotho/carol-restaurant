// File: lib/cloverClient.ts
// ------------------------------------------------------------------
// • Central Clover helper: environment config, generic fetch wrapper,
//   and a convenience function to read the Clover V3 catalog (with
//   v3→v2 fallback for menu sync).
// • Logs every outbound request (method, URL, and payload)
//   so you can pinpoint exactly what is being sent to Clover.
// ------------------------------------------------------------------

export interface CloverConfig {
  baseUrl:    string;
  merchantId: string;
  /** Public OAuth API token – used for most endpoints */
  token:      string;
  /** Private‐eCom token – required only for fetchCloverItems */
  privToken?: string;
}

/* ───────────────────────  Env → Config  ─────────────────────── */

/**
 * Reads required and optional Clover environment variables.
 * Throws if any mandatory variable is missing.
 * Does NOT throw if privToken is absent (only needed by fetchCloverItems).
 */
export function getCloverConfig(): CloverConfig {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    // Production environment – expect *_PROD variables
    if (!process.env.CLOVER_BASE_URL_PROD?.trim()) {
      throw new Error('Missing or invalid environment variable: "CLOVER_BASE_URL_PROD".');
    }
    if (!process.env.CLOVER_MERCHANT_ID_PROD?.trim()) {
      throw new Error('Missing or invalid environment variable: "CLOVER_MERCHANT_ID_PROD".');
    }
    if (!process.env.CLOVER_API_TOKEN_PROD?.trim()) {
      throw new Error('Missing or invalid environment variable: "CLOVER_API_TOKEN_PROD".');
    }

    const baseUrl    = process.env.CLOVER_BASE_URL_PROD.trim();
    const merchantId = process.env.CLOVER_MERCHANT_ID_PROD.trim();
    const token      = process.env.CLOVER_API_TOKEN_PROD.trim();
    const privToken  = process.env.CLOVER_PRIVATE_ECOM_TOKEN_PROD?.trim();

    return {
      baseUrl,
      merchantId,
      token,
      privToken: privToken && privToken !== "" ? privToken : undefined,
    };
  } else {
    // Sandbox (development) environment – expect *_SANDBOX variables
    if (!process.env.CLOVER_BASE_URL_SANDBOX?.trim()) {
      throw new Error('Missing or invalid environment variable: "CLOVER_BASE_URL_SANDBOX".');
    }
    if (!process.env.CLOVER_MERCHANT_ID_SANDBOX?.trim()) {
      throw new Error('Missing or invalid environment variable: "CLOVER_MERCHANT_ID_SANDBOX".');
    }
    if (!process.env.CLOVER_API_TOKEN_SANDBOX?.trim()) {
      throw new Error('Missing or invalid environment variable: "CLOVER_API_TOKEN_SANDBOX".');
    }

    const baseUrl    = process.env.CLOVER_BASE_URL_SANDBOX.trim();
    const merchantId = process.env.CLOVER_MERCHANT_ID_SANDBOX.trim();
    const token      = process.env.CLOVER_API_TOKEN_SANDBOX.trim();
    const privToken  = process.env.CLOVER_PRIVATE_ECOM_TOKEN_SANDBOX?.trim();

    return {
      baseUrl,
      merchantId,
      token,
      privToken: privToken && privToken !== "" ? privToken : undefined,
    };
  }
}

/* ─────────────────────────  Generic fetch  ───────────────────────── */

/**
 * Wrapper around fetch() that ensures:
 *  - JSON headers are always set (Content-Type + Accept)
 *  - The public OAuth bearer token is applied
 *  - Logs every outbound request (method, URL, and payload)
 *  - On 404 for /v3/merchants/... automatically retries /v2/merchants/...
 *  - Errors are caught and thrown with full Clover response body
 *
 * @param path    Path after baseUrl (e.g., "/v3/merchants/{mId}/items")
 * @param options fetch options (method, body, etc.)
 */
export async function cloverFetch<T = any>(
  path:     string,
  options:  RequestInit = {}
): Promise<T> {
  const { baseUrl, token } = getCloverConfig();
  const v3Url = `${baseUrl}${path}`;

  // Always send JSON headers
  const headers: Record<string, string> = {
    "Content-Type":  "application/json",
    "Accept":        "application/json",
    Authorization:   `Bearer ${token}`,
    ...(options.headers as Record<string, string> | undefined),
  };

  // Log the outbound request
  const method = (options.method || "GET").toUpperCase();
  console.log("[Clover Request]", method, v3Url, "Payload:", options.body ?? "<no body>");

  let response = await fetch(v3Url, { ...options, headers });

  // If 404 on a /v3/merchants/... path, retry /v2/merchants/...
  if (
    response.status === 404 &&
    path.startsWith("/v3/merchants/")
  ) {
    const v2Path = path.replace(/^\/v3\/merchants\//, "/v2/merchants/");
    const v2Url  = `${baseUrl}${v2Path}`;

    console.log("[Clover Fallback] 404 from v3, retrying v2:", method, v2Url, "Payload:", options.body ?? "<no body>");
    response = await fetch(v2Url, { ...options, headers });
  }

  // 204 No Content ⇒ return empty object of type T
  if (response.status === 204) {
    return {} as T;
  }

  // Parse response text to JSON (even on error)
  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Clover API Error [${response.status} ${response.statusText}]: Invalid JSON response`
      );
    }
  }

  // If not OK, throw with full JSON body for debugging
  if (!response.ok) {
    throw new Error(
      `Clover API Error [${response.status} ${response.statusText}]: ${JSON.stringify(data)}`
    );
  }

  return data as T;
}

/* ─────────────────────────  Catalog helper  ───────────────────────── */

export interface CloverCatalogItem {
  id:      string;
  name:    string;
  price:   number;   // in cents
  taxable: boolean;
}

/**
 * Fetch all items from the Clover V3 catalog.
 * Uses the private‐eCom token. Throws if `privToken` is missing.
 * Falls back to /v2/merchants/{mId}/items if /v3/ returns 404.
 *
 * @returns Promise<CloverCatalogItem[]> – array of catalog items
 */
export async function fetchCloverItems(): Promise<CloverCatalogItem[]> {
  const { baseUrl, merchantId, privToken } = getCloverConfig();

  if (!privToken) {
    throw new Error(
      `Missing or invalid Clover environment variable for private token (e.g., "CLOVER_PRIVATE_ECOM_TOKEN_SANDBOX" or "CLOVER_PRIVATE_ECOM_TOKEN_PROD").`
    );
  }

  const v3Url = `${baseUrl}/v3/merchants/${merchantId}/items`;

  console.log("[Clover Catalog Request] GET", v3Url, "Payload: <none>");

  let response = await fetch(v3Url, {
    method: "GET",
    headers: {
      Accept:        "application/json",
      Authorization: `Bearer ${privToken}`,
    },
  });

  // If 404, retry v2
  if (response.status === 404) {
    const v2Url = `${baseUrl}/v2/merchants/${merchantId}/items`;
    console.log("[Clover Catalog Fallback] 404 from v3, retrying v2:", "GET", v2Url);
    response = await fetch(v2Url, {
      method: "GET",
      headers: {
        Accept:        "application/json",
        Authorization: `Bearer ${privToken}`,
      },
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Clover Catalog Error [${response.status} ${response.statusText}]: ${errText}`
    );
  }

  const payload: { elements?: any[]; items?: any[] } = await response.json();
  const rawItems = payload.elements ?? payload.items ?? [];

  return rawItems.map((it) => ({
    id:      String(it.id),
    name:    String(it.name),
    price:   typeof it.price === "number" ? it.price : 0,
    taxable: Boolean(it.taxable),
  }));
}
