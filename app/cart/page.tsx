// File: app/cart/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Server route for /cart – pulls cart from cookie, fetches cross-sell items,
// then renders the CartPage client component.
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCrossSellSuggestions } from "@/lib/recommendations";
import CartPage from "@/components/CartPage/CartPage";
import type { CartItem, MenuItem as MenuItemType } from "@/utils/types";

/* ------------------------------------------------------------------ *
 *  Helper — read the visitor’s cart from the "cart" cookie            *
 *  (Adjust if you store cart elsewhere.)                              *
 * ------------------------------------------------------------------ */
async function readCartFromCookie(): Promise<CartItem[]> {
  // In your Next.js version `cookies()` returns a Promise
  const cookieStore = await cookies();
  const raw = cookieStore.get("cart")?.value;
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ *
 *  Route Component (server)                                           *
 * ------------------------------------------------------------------ */
export default async function CartPageRoute() {
  /* 1. Current cart */
  const cart = await readCartFromCookie();
  const cartIds = cart.map((i) => i.id);

  /* 2. Cross-sell suggestions (different categories) */
  const crossSellRaw = await getCrossSellSuggestions(prisma, cartIds, 6);

  /* 3. Cast to local MenuItem type to satisfy TS (`null` vs `undefined`) */
  const crossSell = crossSellRaw as unknown as MenuItemType[];

  /* 4. Render client page */
  return <CartPage cart={cart} crossSell={crossSell} />;
}
