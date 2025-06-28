// File: lib/clover/menuService.ts

import {
  PrismaClient,
  MenuItem,
  MenuItemOptionGroup,
  MenuOptionChoice,
  NestedOptionGroup,
  NestedOptionChoice,
} from "@prisma/client";
import { cloverFetch, getCloverConfig } from "../cloverClient";
import { pushStockToClover } from "./inventoryService";

const prisma = new PrismaClient();
const { merchantId } = getCloverConfig();

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

// Convert dollars → cents
const cents = (d: number) => Math.round(d * 100);

// Build the payload for creating/updating an item (no category here)
const buildItemPayload = (item: Pick<MenuItem, "title" | "price">) => ({
  name:    item.title,
  price:   cents(item.price),
  taxable: true,
});

// Build the payload for creating/updating a modifier
const buildModifierPayload = (
  label: string,
  priceAdj: number | null,
  hasNested: boolean
) => ({
  name:  label,
  price: hasNested ? 0 : cents(priceAdj ?? 0),
});

/**
 * Ensure a modifier group exists in Clover (create or update).
 * Returns the Clover group ID.
 */
async function ensureModifierGroup(
  title: string,
  cloverGroupId: string | null
): Promise<string> {
  if (cloverGroupId) {
    // Update existing group
    await cloverFetch(
      `/v3/merchants/${merchantId}/modifier_groups/${cloverGroupId}`,
      {
        method: "PUT",
        body: JSON.stringify({ name: title }),
      }
    );
    return cloverGroupId;
  }

  // Create new group
  const { id: newId } = await cloverFetch<{ id: string }>(
    `/v3/merchants/${merchantId}/modifier_groups`,
    { method: "POST", body: JSON.stringify({ name: title }) }
  );
  return newId;
}

/**
 * Ensure a modifier exists in a group (create or update).
 * Returns the Clover modifier ID.
 */
async function ensureModifier(
  groupId: string,
  label: string,
  priceAdj: number | null,
  cloverModifierId: string | null
): Promise<string> {
  const payload = buildModifierPayload(label, priceAdj, false);

  if (cloverModifierId) {
    // Update existing modifier
    await cloverFetch(
      `/v3/merchants/${merchantId}/modifier_groups/${groupId}/modifiers/${cloverModifierId}`,
      { method: "PUT", body: JSON.stringify(payload) }
    );
    return cloverModifierId;
  }

  // Create new modifier
  const { id: newId } = await cloverFetch<{ id: string }>(
    `/v3/merchants/${merchantId}/modifier_groups/${groupId}/modifiers`,
    { method: "POST", body: JSON.stringify(payload) }
  );
  return newId;
}

/**
 * Get an existing category by name, or create it if missing.
 * Returns the Clover category ID.
 */
async function getOrCreateCategoryId(name: string): Promise<string> {
  // 1) Try to find by exact name
  const res = await cloverFetch<{ elements: Array<{ id: string }> }>(
    `/v3/merchants/${merchantId}/categories?filter=name eq "${encodeURIComponent(
      name
    )}"`
  );
  if (res.elements.length) {
    return res.elements[0].id;
  }

  // 2) Create a new category
  const { id: newId } = await cloverFetch<{ id: string }>(
    `/v3/merchants/${merchantId}/categories`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    }
  );
  return newId;
}

/**
 * Upsert the menu item in Clover.
 * - On first sync: POST → persist returned cloverItemId → enable stock tracking
 * - On edits: PUT against the stored cloverItemId
 */
async function upsertItem(
  item: Pick<MenuItem, "id" | "title" | "price" | "cloverItemId">
): Promise<string> {
  const isNew = !item.cloverItemId;
  const path  = isNew
    ? `/v3/merchants/${merchantId}/items`
    : `/v3/merchants/${merchantId}/items/${item.cloverItemId}`;
  const method = isNew ? "POST" : "PUT";

  const payload = buildItemPayload(item);
  const { id: returnedId } = await cloverFetch<{ id: string }>(path, {
    method,
    body: JSON.stringify(payload),
  });

  if (isNew) {
    // 1) Persist for future edits
    await prisma.menuItem.update({
      where: { id: item.id },
      data: { cloverItemId: returnedId },
    });

    // 2) Immediately enable stock tracking (seed quantity 0)
    //    This flags the item for inventory and prevents 405 on stock_levels
    await cloverFetch(
      `/v3/merchants/${merchantId}/item_stocks/${returnedId}`,
      {
        method: "POST",
        body: JSON.stringify({ quantity: 0 }),
      }
    );
  }

  return returnedId;
}

/**
 * Safely link an existing Clover item to a Clover category.
 * Performs a quick HEAD-style check on the category first; logs & skips on 404.
 */
async function attachItemToCategoryOnClover(
  cloverItemId: string,
  cloverCategoryId: string
) {
  try {
    // Verify category exists
    await cloverFetch(
      `/v3/merchants/${merchantId}/categories/${cloverCategoryId}`
    );
  } catch {
    console.warn(
      `Skipping link: category ${cloverCategoryId} not found in merchant ${merchantId}`
    );
    return;
  }

  const associationPayload = {
    elements: [
      {
        item:     { id: cloverItemId },
        category: { id: cloverCategoryId },
      },
    ],
  };

  await cloverFetch(`/v3/merchants/${merchantId}/category_items`, {
    method: "POST",
    body: JSON.stringify(associationPayload),
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Primary sync functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Sync a single local MenuItem to Clover:
 *   1. Upsert the item itself (name, price, taxable, and enable stock tracking)
 *   2. Resolve and attach its category
 *   3. Upsert/delete modifier groups & modifiers
 *   4. Sync stock levels via inventoryService
 */
export async function syncOne(itemId: string) {
  // 1. Fetch local MenuItem + relations
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: {
      category: true,
      optionGroups: {
        include: {
          choices: {
            include: { nestedOptionGroup: { include: { choices: true } } },
          },
        },
      },
    },
  });
  if (!item) throw new Error(`MenuItem not found: ${itemId}`);

  // 2. Upsert the item in Clover (with auto stock-tracking on create)
  const cloverItemId = await upsertItem({
    id:           item.id,
    title:        item.title,
    price:        item.price,
    cloverItemId: item.cloverItemId,
  });

  // 3. Resolve category (DB value or lookup/create); persist if freshly created
  let categoryCloverId: string | null = item.category?.cloverCategoryId ?? null;
  if (item.category) {
    if (!categoryCloverId) {
      categoryCloverId = await getOrCreateCategoryId(item.category.name);
      await prisma.menuCategory.update({
        where: { id: item.category.id },
        data: { cloverCategoryId: categoryCloverId },
      });
    }
    await attachItemToCategoryOnClover(cloverItemId, categoryCloverId);
  }

  // 4–8. Modifiers sync (unchanged)
  const existingGroups    = await prisma.menuItemOptionGroup.findMany({ where: { menuItemId: itemId } });
  const existingGroupsMap = Object.fromEntries(existingGroups.map((g) => [g.id, g]));
  const existingChoices   = await prisma.menuOptionChoice.findMany({ where: { optionGroup: { menuItemId: itemId } } });
  const existingChoicesMap = Object.fromEntries(existingChoices.map((c) => [c.id, c]));
  const existingNestedGroups = await prisma.nestedOptionGroup.findMany({ where: { parentChoice: { optionGroup: { menuItemId: itemId } } } });
  const existingNestedGroupsMap = Object.fromEntries(existingNestedGroups.map((ng) => [ng.id, ng]));
  const existingNestedChoices = await prisma.nestedOptionChoice.findMany({ where: { nestedGroup: { parentChoice: { optionGroup: { menuItemId: itemId } } } } });
  const existingNestedChoicesMap = Object.fromEntries(existingNestedChoices.map((nc) => [nc.id, nc]));

  const seenGroupIds: string[]       = [];
  const seenModifierIds: string[]    = [];
  const seenNestedGroupIds: string[] = [];
  const seenNestedModifierIds: string[] = [];

  for (const group of item.optionGroups) {
    const oldGroup = existingGroupsMap[group.id];
    const newGroupId = await ensureModifierGroup(group.title, oldGroup?.cloverGroupId ?? null);
    seenGroupIds.push(newGroupId);
    if (newGroupId !== oldGroup?.cloverGroupId) {
      await prisma.menuItemOptionGroup.update({ where: { id: group.id }, data: { cloverGroupId: newGroupId } });
    }

    for (const choice of group.choices) {
      const oldChoice = existingChoicesMap[choice.id];
      if (choice.nestedOptionGroup) {
        const ng = choice.nestedOptionGroup as NestedOptionGroup & { choices: NestedOptionChoice[] };
        const nestedName = `${group.title} – ${choice.label}`;
        const oldNg = existingNestedGroupsMap[ng.id];
        const newNgId = await ensureModifierGroup(nestedName, oldNg?.cloverGroupId ?? null);
        seenNestedGroupIds.push(newNgId);
        if (newNgId !== oldNg?.cloverGroupId) {
          await prisma.nestedOptionGroup.update({ where: { id: ng.id }, data: { cloverGroupId: newNgId } });
        }
        for (const nc of ng.choices) {
          const oldNc = existingNestedChoicesMap[nc.id];
          const modId = await ensureModifier(newNgId, nc.label, nc.priceAdjustment ?? 0, oldNc?.cloverModifierId ?? null);
          seenNestedModifierIds.push(modId);
          if (modId !== oldNc?.cloverModifierId) {
            await prisma.nestedOptionChoice.update({ where: { id: nc.id }, data: { cloverModifierId: modId } });
          }
        }
        for (const oldNc of Object.values(existingNestedChoicesMap)) {
          if (oldNc.nestedGroupId === ng.id && !ng.choices.some((c) => c.id === oldNc.id)) {
            if (oldNc.cloverModifierId) {
              await cloverFetch(`/v3/merchants/${merchantId}/modifier_groups/${newNgId}/modifiers/${oldNc.cloverModifierId}`, { method: "DELETE" });
            }
            await prisma.nestedOptionChoice.delete({ where: { id: oldNc.id } });
          }
        }
      } else {
        const modId = await ensureModifier(newGroupId, choice.label, choice.priceAdjustment ?? 0, oldChoice?.cloverModifierId ?? null);
        seenModifierIds.push(modId);
        if (modId !== oldChoice?.cloverModifierId) {
          await prisma.menuOptionChoice.update({ where: { id: choice.id }, data: { cloverModifierId: modId } });
        }
      }
    }

    for (const oldChoice of Object.values(existingChoicesMap)) {
      if (oldChoice.optionGroupId === group.id && !group.choices.some((c) => c.id === oldChoice.id)) {
        if (oldChoice.cloverModifierId) {
          await cloverFetch(`/v3/merchants/${merchantId}/modifier_groups/${newGroupId}/modifiers/${oldChoice.cloverModifierId}`, { method: "DELETE" });
        }
        await prisma.menuOptionChoice.delete({ where: { id: oldChoice.id } });
      }
    }
  }

  for (const oldGrp of Object.values(existingGroupsMap)) {
    if (!item.optionGroups.some((g) => g.id === oldGrp.id)) {
      if (oldGrp.cloverGroupId) {
        await cloverFetch(`/v3/merchants/${merchantId}/modifier_groups/${oldGrp.cloverGroupId}`, { method: "DELETE" });
      }
      await prisma.menuItemOptionGroup.delete({ where: { id: oldGrp.id } });
    }
  }

  let linkedIds: string[] = [];
  let assocMap: Record<string, string> = {};
  try {
    const assoc = await cloverFetch<{
      elements: Array<{ id: string; modifierGroup: { id: string } }>
    }>(`/v3/merchants/${merchantId}/items/${cloverItemId}/item_modifier_groups`);
    linkedIds = assoc.elements.map((e) => e.modifierGroup.id);
    assoc.elements.forEach((e) => { assocMap[e.modifierGroup.id] = e.id; });
  } catch (err: any) {
    if (!String(err.message).includes("405")) throw err;
  }

  const allToLink = [...seenGroupIds, ...seenNestedGroupIds];
  for (const gId of allToLink) {
    if (!linkedIds.includes(gId)) {
      await cloverFetch(`/v3/merchants/${merchantId}/item_modifier_groups`, {
        method: "POST",
        body: JSON.stringify({ elements: [{ item: { id: cloverItemId }, modifierGroup: { id: gId } }] }),
      });
    }
  }
  for (const oldId of linkedIds) {
    if (!allToLink.includes(oldId)) {
      await cloverFetch(`/v3/merchants/${merchantId}/item_modifier_groups/${assocMap[oldId]}`, { method: "DELETE" });
    }
  }

  // 9. Finally, sync stock (inventoryService will handle 405→item_stocks fallback)
  try {
    await pushStockToClover(item.id, item.stock);
  } catch (e: any) {
    console.error("Failed to push stock (continuing):", e);
  }
}

/**
 * Bulk sync all menu items.
 */
export async function syncAllMenuItems() {
  const ids = await prisma.menuItem.findMany({ select: { id: true } });
  for (const { id } of ids) {
    try {
      await syncOne(id);
    } catch (err) {
      console.error(`Sync error for menu item ${id}:`, err);
    }
  }
  return { success: true, count: ids.length };
}
