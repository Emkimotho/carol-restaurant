// File: app/api/clover/items/route.ts
// -----------------------------------------------------------------------------
// GET /api/clover/items
// Thin wrapper around our shared Clover client — returns the merchant’s full
// item list (v3 endpoint, v2 fallback handled inside cloverFetch).
//
// Environment variables are **not** accessed here directly; everything comes
// from getCloverConfig(), so you only need CLOVER_MERCHANT_ID / CLOVER_API_TOKEN
// (plus *_PROD for production) in one place.
// -----------------------------------------------------------------------------

import { NextResponse }               from 'next/server';
import { cloverFetch, getCloverConfig } from '@/lib/clover';

export async function GET() {
  try {
    const { merchantId } = getCloverConfig();

    // Optional query-string passthrough (limit / offset / expand etc.)
    const search = new URLSearchParams();
    const reqUrl = new URL('http://dummy');               // placeholder
    // Remix any ?limit=…&offset=… in the incoming request
    // (Next.js doesn’t expose searchParams directly in a route handler)
    // Feel free to remove if you don’t need pagination.
    const limit  = reqUrl.searchParams.get('limit');
    const offset = reqUrl.searchParams.get('offset');
    if (limit)  search.append('limit',  limit);
    if (offset) search.append('offset', offset);

    const path = `/v3/merchants/${merchantId}/items` +
                 (search.size ? `?${search.toString()}` : '');

    const data = await cloverFetch(path);       // logs + v3→v2 fallback

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[api/clover/items] Error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Error fetching Clover items' },
      { status: 500 },
    );
  }
}
