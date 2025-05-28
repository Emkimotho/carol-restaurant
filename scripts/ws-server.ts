// File: scripts/ws-server.ts
// ──────────────────────────────────────────────────────────────
//  Stand-alone WebSocket server (ts-node) for dev mode
//
//  • Run with `node scripts/ws-server.ts` to start on port 4000.
//  • Importing this module elsewhere will NOT start the server.
//  • Each client connects with ?room=<orderId>|ALL
//  • Use `broadcast(room, payload)` from other modules to push updates.
// ──────────────────────────────────────────────────────────────

import { WebSocketServer, WebSocket } from "ws";
import http from "http";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */
const PORT = Number(process.env.WS_PORT) || 4000;

/* ------------------------------------------------------------------ */
/*  Create an HTTP server (so we can attach upgrade manually)          */
/* ------------------------------------------------------------------ */
const server = http.createServer((_, res) => {
  res.writeHead(200);
  res.end("WebSocket server running\n");
});

/* ------------------------------------------------------------------ */
/*  Singleton WSS                                                      */
/* ------------------------------------------------------------------ */
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, request) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  (ws as any).room = url.searchParams.get("room") || "ALL";
  console.log("🔌  Client connected :: room =", (ws as any).room);

  ws.on("close", () => console.log("❌  Client disconnected"));
});

/* ------------------------------------------------------------------ */
/*  Upgrade HTTP → WS                                                  */
/* ------------------------------------------------------------------ */
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

/* ------------------------------------------------------------------ */
/*  Broadcast helper                                                   */
/* ------------------------------------------------------------------ */
export const broadcast = (room: string, payload: unknown) => {
  const message = JSON.stringify(payload);
  for (const client of wss.clients as Iterable<WebSocket & { room?: string }>) {
    if (
      client.readyState === WebSocket.OPEN &&
      (client.room === room || client.room === "ALL")
    ) {
      client.send(message);
    }
  }
};

/* ------------------------------------------------------------------ */
/*  Only start listening when run directly (CLI), not when imported   */
/* ------------------------------------------------------------------ */
if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(PORT, () => {
    console.log(`✅  WS server ready at ws://localhost:${PORT}`);
  });
}
