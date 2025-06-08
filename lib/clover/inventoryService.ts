/* ------------------------------------------------------------------ */
/*  File: lib/clover/inventoryService.ts                               */
/* ------------------------------------------------------------------ 
   • pushStockToClover(menuItemId, newQuantity) – read the given 
     MenuItem (including its cloverItemId) from Prisma, then send a 
     POST to Clover’s /stock_levels endpoint to create/update its 
     inventory level.
   • pullStockFromClover() – fetch all inventory levels from Clover, 
     match each stock record’s item.id to your local menuItem.cloverItemId, 
     update local Prisma menuItem.stock if it differs, and return how many 
     rows were updated.
   ------------------------------------------------------------------ */

import { PrismaClient } from "@prisma/client";
import { cloverFetch, getCloverConfig } from "../cloverClient";

const prisma = new PrismaClient();
const { merchantId } = getCloverConfig();

/**
 * pushStockToClover
 *
 * Reads the specified menuItemId from Prisma (including its cloverItemId).
 * Then sends a POST to Clover’s /v3/merchants/{mId}/stock_levels endpoint
 * with a payload to set the inventory level to newQuantity. If the item
 * has no cloverItemId, throws an error.
 *
 * @param menuItemId  The local Prisma MenuItem.id
 * @param newQuantity The desired stock quantity to push to Clover
 */
export async function pushStockToClover(
  menuItemId: string,
  newQuantity: number
): Promise<void> {
  // 1) Read the local MenuItem so we know its cloverItemId
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: { cloverItemId: true },
  });

  if (!menuItem) {
    throw new Error(`Cannot push stock: MenuItem with id="${menuItemId}" not found.`);
  }
  if (!menuItem.cloverItemId) {
    throw new Error(
      `Cannot push stock: MenuItem "${menuItemId}" has no associated cloverItemId.`
    );
  }

  // 2) Build the “stock_levels” payload
  //    Clover’s V3 stock_levels endpoint expects a JSON body like:
  //    {
  //      "elements": [
  //        {
  //          "item": { "id": "<cloverItemId>" },
  //          "stock": { "quantity": <newQuantity> }
  //        }
  //      ]
  //    }
  const payload = {
    elements: [
      {
        item: { id: menuItem.cloverItemId },
        stock: { quantity: newQuantity },
      },
    ],
  };

  // 3) Send POST to /v3/merchants/{mId}/stock_levels
  //    If Clover returns a “stockLevelId” or similar, you could choose to
  //    store it in Prisma for future PUT requests. For most cases,
  //    repeatedly POSTing with the same cloverItemId will update the same record.
  await cloverFetch(`/v3/merchants/${merchantId}/stock_levels`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * pullStockFromClover
 *
 * Fetches all inventory levels from Clover’s /v3/merchants/{mId}/stock_levels
 * endpoint (paginated if necessary). For each returned stock record, it finds
 * the matching local MenuItem by cloverItemId. If the stock quantity from
 * Clover differs from menuItem.stock in Prisma, it updates the local row.
 *
 * @returns An object containing updatedCount (how many menuItem.stock fields changed)
 */
export async function pullStockFromClover(): Promise<{ updatedCount: number }> {
  let updatedCount = 0;
  let offset = 0;
  const limit = 250; // Clover’s default max page size
  let hasMore = true;

  while (hasMore) {
    // 1) Fetch a page of stock levels
    const url = `/v3/merchants/${merchantId}/stock_levels?limit=${limit}&offset=${offset}`;
    const response = await cloverFetch<{
      elements: Array<{ id: string; item: { id: string }; stock: { quantity: number } }>;
      count: number;
      total: number;
    }>(url);

    // 2) Loop through each stock record
    for (const record of response.elements) {
      const cloverItemId = record.item.id;
      const cloverQuantity = record.stock.quantity;

      // Find the local MenuItem that matches this cloverItemId
      // Use findFirst if cloverItemId is not unique
      const menuItem = await prisma.menuItem.findFirst({
        where: { cloverItemId },
        select: { id: true, stock: true },
      });
      if (!menuItem) {
        continue; // No local record for this cloverItemId
      }

      // If local stock differs, update it
      if (menuItem.stock !== cloverQuantity) {
        await prisma.menuItem.update({
          where: { id: menuItem.id },
          data: { stock: cloverQuantity },
        });
        updatedCount++;
      }
    }

    // 3) Determine if there are more pages
    if (response.count < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }

  return { updatedCount };
}
