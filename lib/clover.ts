// File: lib/clover.ts

/**
 * Utility functions for interacting with the Clover API.
 */

export async function fetchCloverItems() {
    const CLOVER_ACCESS_TOKEN = process.env.CLOVER_ACCESS_TOKEN;
    const MERCHANT_ID = process.env.MERCHANT_ID;
  
    if (!CLOVER_ACCESS_TOKEN || !MERCHANT_ID) {
      throw new Error('Missing CLOVER_ACCESS_TOKEN or MERCHANT_ID');
    }
  
    const url = `https://sandbox.dev.clover.com/v3/merchants/${MERCHANT_ID}/items`;
  
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLOVER_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error fetching Clover items: ${errorData.message}`);
    }
  
    const data = await response.json();
    return data;
  }
  
  export async function createCloverPaymentSession(payload: any) {
    const CLOVER_ACCESS_TOKEN = process.env.CLOVER_ACCESS_TOKEN;
    const MERCHANT_ID = process.env.MERCHANT_ID;
  
    if (!CLOVER_ACCESS_TOKEN || !MERCHANT_ID) {
      throw new Error('Missing CLOVER_ACCESS_TOKEN or MERCHANT_ID');
    }
  
    const paymentUrl = `https://sandbox.dev.clover.com/v3/merchants/${MERCHANT_ID}/payments`;
  
    const response = await fetch(paymentUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOVER_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error creating payment session: ${errorData.message}`);
    }
  
    const data = await response.json();
    return data;
  }
  