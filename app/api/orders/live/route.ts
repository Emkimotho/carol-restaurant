// File: app/api/orders/live/route.ts
/**
 * Edge-runtime WebSocket hub.
 * Other API routes call `broadcast()` to push JSON patches
 * to every connected Admin/Driver dashboard.
 */
export const runtime = 'edge';

/* --- Edge global types -------------------------------------------------- */
declare const Deno: {
  upgradeWebSocket: (req: Request) => {
    socket: WebSocket;
    response: Response;
  };
};

declare global {
  // One shared set of sockets across edge invocations.
  var __orderSockets: Set<WebSocket> | undefined;
}
globalThis.__orderSockets ??= new Set();

/* --- Route handler ------------------------------------------------------ */
export default function handler(req: Request): Response {
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('WebSocket upgrade required', { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => globalThis.__orderSockets!.add(socket);
  const drop = () => globalThis.__orderSockets!.delete(socket);
  socket.onclose = drop;
  socket.onerror = drop;

  return response;
}

/* --- Broadcast helper --------------------------------------------------- */
export function broadcast(data: unknown): void {
  const msg = JSON.stringify(data);
  for (const ws of globalThis.__orderSockets!) {
    try {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    } catch {
      /* ignore */
    }
  }
}
