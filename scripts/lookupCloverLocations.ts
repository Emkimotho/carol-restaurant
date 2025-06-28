#!/usr/bin/env node
/**
 * Prints all Clover locations (id + name) for the merchant in your env.
 * Run with:  npx tsx scripts/lookupCloverLocations.ts
 */

interface CloverLocation {
  id: string;
  name: string;
}
interface LocationResponse {
  elements: CloverLocation[];
}

async function main() {
  const BASE_URL    = process.env.CLOVER_BASE_URL    ?? 'https://apisandbox.dev.clover.com';
  const MERCHANT_ID = process.env.CLOVER_MERCHANT_ID ?? '';
  const PRIVATE_KEY = process.env.CLOVER_PRIVATE_KEY ?? '';

  if (!MERCHANT_ID || !PRIVATE_KEY) {
    console.error('❌  Set CLOVER_MERCHANT_ID and CLOVER_PRIVATE_KEY first.');
    process.exit(1);
  }

  const url  = `${BASE_URL}/v3/merchants/${MERCHANT_ID}/locations?fields=id,name`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${PRIVATE_KEY}` },
  });

  if (!resp.ok) {
    console.error(`❌  HTTP ${resp.status}: ${await resp.text()}`);
    process.exit(1);
  }

  const data = (await resp.json()) as LocationResponse;
  if (!data.elements.length) {
    console.log('⚠️  No locations found.');
    return;
  }

  console.log('📍  Clover Locations:');
  data.elements.forEach(loc => console.log(`   • ${loc.name}  →  ${loc.id}`));
}

main().catch(err => {
  console.error('❌  Unexpected error:', err);
  process.exit(1);
});
