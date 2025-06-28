/* ------------------------------------------------------------------
 * File: lib/clover/getLocationId.ts
 * ------------------------------------------------------------------
 * Fetch-once / cache-forever helper for Clover `locationId`.
 *
 *  • Fast path: return from in-memory cache.
 *  • Next: check `process.env.CLOVER_LOCATION_ID`.
 *  • Next: check Prisma SystemSetting row  (key = "cloverLocationId").
 *  • Fallback: hit /v3/merchants/{mId}/devices, read first.device.location.id,
 *              then persist to SystemSetting **and** set process.env so any
 *              downstream code sees the value immediately.
 *
 *  Thread-safe: a singleton Promise ensures only one network trip even under
 *  concurrent requests on cold start.
 * ------------------------------------------------------------------ */

import { PrismaClient } from "@prisma/client";
import { cloverFetch, getCloverConfig } from "@/lib/cloverClient";

const prisma = new PrismaClient();

/** in-memory cache for the lifetime of the Node process */
let cachedLocationId: string | undefined;
/** singleton promise so concurrent callers await the same work */
let inflight: Promise<string> | undefined;

/**
 * Public: always resolves to a non-empty Clover location UUID.
 * Throws if none can be discovered.
 */
export async function getLocationId(): Promise<string> {
  // ── 1. Fast in-memory cache ───────────────────────────────────────
  if (cachedLocationId) return cachedLocationId;

  // ── 2. Singleton guard (prevents duplicate API calls) ─────────────
  if (inflight) return inflight;

  inflight = (async () => {
    // 2a. Env-var already set?
    const fromEnv = process.env.CLOVER_LOCATION_ID?.trim();
    if (fromEnv) {
      cachedLocationId = fromEnv;
      return cachedLocationId;
    }

    // 2b. DB cache?
    const row = await prisma.systemSetting.findUnique({
      where: { key: "cloverLocationId" },
      select: { value: true },
    });
    if (row?.value) {
      cachedLocationId = row.value;
      // patch env for the current process (optional convenience)
      process.env.CLOVER_LOCATION_ID = cachedLocationId;
      return cachedLocationId;
    }

    // 2c. Fallback → hit /devices and discover
    const { merchantId } = getCloverConfig();
    type Device = { location?: { id: string } };
    const devices = await cloverFetch<Device[]>(
      `/v3/merchants/${merchantId}/devices`
    );

    const discovered = devices[0]?.location?.id?.trim();
    if (!discovered) {
      throw new Error(
        "Unable to discover Clover locationId: /devices returned no devices with a location."
      );
    }

    // Persist to DB for next cold start
    await prisma.systemSetting.upsert({
      where: { key: "cloverLocationId" },
      update: { value: discovered },
      create: { key: "cloverLocationId", value: discovered },
    });

    // Cache in memory + env
    cachedLocationId = discovered;
    process.env.CLOVER_LOCATION_ID = discovered;
    return discovered;
  })();

  try {
    return await inflight;
  } finally {
    inflight = undefined; // reset so future misses can retry if needed
  }
}

/**
 * Helper used by webhook handler to refresh the cache if Clover ever
 * sends us an order from a *new* location (multi-store merchants).
 */
export async function updateLocationId(newId: string) {
  const id = newId.trim();
  if (!id || id === cachedLocationId) return;

  await prisma.systemSetting.upsert({
    where: { key: "cloverLocationId" },
    update: { value: id },
    create: { key: "cloverLocationId", value: id },
  });

  cachedLocationId = id;
  process.env.CLOVER_LOCATION_ID = id;
  console.log("[Clover] locationId updated →", id);
}
