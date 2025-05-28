// File: app/api/ws/route.ts
// ----------------------------------------------------------------------
// • Responsibility: provide a simple HTTP health check for your WS server
//   and expose a secure helper to broadcast messages from your server-side
//   code (e.g. webhooks) to connected WebSocket clients.
//   – GET  /api/ws           → returns JSON status (no WS handshake here).
//   – broadcastStatus(room, payload) → server-only import to push updates.
// ----------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { broadcast }    from '../../../scripts/ws-server';

/**
 * GET handler for non-WebSocket clients.
 * Use this endpoint to verify your WS server is reachable.
 */
export async function GET() {
  return NextResponse.json(
    { message: 'WebSocket server is running separately at ws://<host>:4000' },
    { status: 200 }
  );
}

/**
 * Server-side helper: send a message to all clients in a room.
 * Only import and call this from trusted server code 
 * (for example, inside your payment or order-status webhooks).
 *
 * @param room    — logical channel name (e.g. "ORDERS", "PAYMENTS")
 * @param payload — any JSON-serializable data to broadcast
 */
export function broadcastStatus(room: string, payload: unknown) {
  broadcast(room, payload);
}
