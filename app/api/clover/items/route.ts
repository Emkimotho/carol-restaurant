// File: app/api/clover/items/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  const CLOVER_ACCESS_TOKEN = process.env.CLOVER_ACCESS_TOKEN;
  const MERCHANT_ID = process.env.MERCHANT_ID;

  if (!CLOVER_ACCESS_TOKEN || !MERCHANT_ID) {
    return NextResponse.json({ error: 'Missing CLOVER_ACCESS_TOKEN or MERCHANT_ID' }, { status: 500 });
  }

  const url = `https://sandbox.dev.clover.com/v3/merchants/${MERCHANT_ID}/items`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOVER_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Clover fetch error:', error);
    return NextResponse.json({ error: 'Error fetching Clover items' }, { status: 500 });
  }
}
