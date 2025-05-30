// File: scripts/ws-server.ts
// ──────────────────────────────────────────────────────────────
//  Stand‑alone WebSocket server (ts‑node) for dev mode
//
//  • Run with `node scripts/ws-server.ts` to start on port 4000.
//  • Importing this module elsewhere will NOT start the server.
//  • Each client connects with ?room=<orderId>|ALL
//  • Use `broadcast(room, payload)` from other modules to push updates.
// ──────────────────────────────────────────────────────────────

import http, { IncomingMessage } from 'http';
import { WebSocketServer }       from 'ws';
import type WebSocket            from 'ws';          // ← type‑only import

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type RoomSocket = WebSocket & { room?: string };

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const PORT = Number(process.env.WS_PORT) || 4000;

/* ------------------------------------------------------------------ */
/*  HTTP shell (for manual upgrade)                                    */
/* ------------------------------------------------------------------ */
const server = http.createServer((_req, res) => {
  res.writeHead(200);
  res.end('WebSocket server running\n');
});

/* ------------------------------------------------------------------ */
/*  WebSocket server                                                   */
/* ------------------------------------------------------------------ */
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: RoomSocket, request: IncomingMessage) => {
  const url = new URL(request.url ?? '', `http://${request.headers.host}`);
  ws.room   = url.searchParams.get('room') ?? 'ALL';

  console.log('🔌  Client connected :: room =', ws.room);

  ws.addEventListener('close', () => console.log('❌  Client disconnected'));
});

/* ------------------------------------------------------------------ */
/*  Upgrade handler                                                    */
/* ------------------------------------------------------------------ */
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
    wss.emit('connection', ws as RoomSocket, req);
  });
});

/* ------------------------------------------------------------------ */
/*  Broadcast helper                                                   */
/* ------------------------------------------------------------------ */
export const broadcast = (room: string, payload: unknown): void => {
  const message = JSON.stringify(payload);

  for (const client of wss.clients as Set<RoomSocket>) {
    if (
      client.readyState === 1 &&                // 1 === WebSocket.OPEN
      (client.room === room || client.room === 'ALL')
    ) {
      client.send(message);
    }
  }
};

/* ------------------------------------------------------------------ */
/*  CLI entry‑point                                                    */
/* ------------------------------------------------------------------ */
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () =>
    console.log(`✅  WS server ready at ws://localhost:${PORT}`),
  );
}
