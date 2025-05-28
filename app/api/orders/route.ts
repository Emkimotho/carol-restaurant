/* ------------------------------------------------------------------ */
/*  File: app/api/orders/route.ts                                     */
/* ------------------------------------------------------------------ */
/*  Thin dispatcher – delegates to controller functions               */
/* ------------------------------------------------------------------ */

import { getOrders }   from "./controllers/getOrders";
import { createOrder } from "./controllers/createOrder";

export async function GET(req: Request) {
  return getOrders(req);
}

export async function POST(req: Request) {
  return createOrder(req);
}
