/* ------------------------------------------------------------------ *
 *  lib/recommendations.ts                                            *
 *                                                                    *
 *  Centralised helpers so routes, API handlers, and tests can share  *
 *  exactly the same recommendation logic.                            *
 *  (Full MenuItem objects are returned—no trimmed projections—       *
 *  so they satisfy ItemDetailPage’s prop types out-of-the-box.)      *
 * ------------------------------------------------------------------ */

import { PrismaClient } from "@prisma/client";

/* ------------------------------------------------------------------ *
 *  1. Same-category up-sell (Item-Detail page)                        *
 * ------------------------------------------------------------------ */
/**
 * Returns up to `limit` items in the *same* category as `itemId`,
 * excluding the item itself and any inactive products.
 *
 * @param prisma – PrismaClient instance (caller injects for testability)
 * @param itemId – the menu item currently being viewed
 * @param limit  – maximum number of suggestions (default 8)
 */
export async function getSameCategorySuggestions(
  prisma: PrismaClient,
  itemId: string,
  limit = 8
) {
  /* 1. Look up the category of the current item */
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: { id: true, categoryId: true },
  });
  if (!item?.categoryId) return [];

  /* 2. Fetch sibling items (full MenuItem including category) */
  return prisma.menuItem.findMany({
    where: {
      categoryId: item.categoryId,
      id: { not: item.id },
      isActive: true,
    },
    include: { category: true },
    orderBy: [{ popularityScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

/* ------------------------------------------------------------------ *
 *  2. Cross-sell (Cart page)                                          *
 * ------------------------------------------------------------------ */
/**
 * Returns items belonging to categories **not** already represented
 * in the cart, excluding the items already in the cart themselves.
 *
 * @param prisma        – PrismaClient instance
 * @param cartItemIds   – array of MenuItem IDs currently in cart
 * @param limit         – maximum number of suggestions (default 8)
 */
export async function getCrossSellSuggestions(
  prisma: PrismaClient,
  cartItemIds: string[],
  limit = 8
) {
  /* Cart empty? → show overall best-sellers */
  if (cartItemIds.length === 0) {
    return prisma.menuItem.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ popularityScore: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  }

  /* 1. Collect categoryIds already in the cart */
  const cartCategories = await prisma.menuItem.findMany({
    where: { id: { in: cartItemIds } },
    select: { categoryId: true },
  });
  const usedCategoryIds = [
    ...new Set(cartCategories.map((c) => c.categoryId).filter(Boolean)),
  ];

  /* 2. Suggest active items in *other* categories, not already in cart */
  return prisma.menuItem.findMany({
    where: {
      id: { notIn: cartItemIds },
      categoryId: { notIn: usedCategoryIds },
      isActive: true,
    },
    include: { category: true },
    orderBy: [{ popularityScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}
