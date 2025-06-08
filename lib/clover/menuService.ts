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

// Helper: convert dollars → cents
const cents = (d: number) => Math.round(d * 100);

// Build the “create/update item” payload (no category here)
const buildItemPayload = (
  item: Pick<MenuItem, "title" | "price">
) => ({
  name:    item.title,
  price:   cents(item.price),
  taxable: true,
});

// Build the “create modifier group” payload
const modPayload = (label: string, priceAdj: number | null, hasNested: boolean) => ({
  name:  label,
  price: hasNested ? 0 : cents(priceAdj ?? 0),
});

async function ensureModifierGroup(
  title: string,
  cloverGroupId: string | null
): Promise<string> {
  if (cloverGroupId) {
    await cloverFetch(`/v3/merchants/${merchantId}/modifier_groups/${cloverGroupId}`, {
      method: "PUT",
      body: JSON.stringify({ name: title }),
    });
    return cloverGroupId;
  } else {
    const { id: newId } = await cloverFetch<{ id: string }>(
      `/v3/merchants/${merchantId}/modifier_groups`,
      { method: "POST", body: JSON.stringify({ name: title }) }
    );
    return newId;
  }
}

async function ensureModifier(
  groupId: string,
  label: string,
  priceAdj: number | null,
  cloverModifierId: string | null
): Promise<string> {
  const payload = modPayload(label, priceAdj, false);
  if (cloverModifierId) {
    await cloverFetch(
      `/v3/merchants/${merchantId}/modifier_groups/${groupId}/modifiers/${cloverModifierId}`,
      { method: "PUT", body: JSON.stringify(payload) }
    );
    return cloverModifierId;
  } else {
    const { id: newId } = await cloverFetch<{ id: string }>(
      `/v3/merchants/${merchantId}/modifier_groups/${groupId}/modifiers`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    return newId;
  }
}

/**
 * Upsert the item itself in Clover (no category field).
 * Returns the new/existing Clover item ID.
 */
async function upsertItem(
  item: Pick<MenuItem, "id" | "title" | "price" | "cloverItemId">
): Promise<string> {
  const path = item.cloverItemId
    ? `/v3/merchants/${merchantId}/items/${item.cloverItemId}`
    : `/v3/merchants/${merchantId}/items`;
  const method = item.cloverItemId ? "PUT" : "POST";

  const payload = buildItemPayload(item);
  const { id } = await cloverFetch<{ id: string }>(path, {
    method,
    body: JSON.stringify(payload),
  });

  if (!item.cloverItemId) {
    // save the new Clover‐assigned ID back to our database
    await prisma.menuItem.update({
      where: { id: item.id },
      data: { cloverItemId: id },
    });
  }

  return item.cloverItemId ?? id;
}

/**
 * Link an existing Clover item to a Clover category via the
 * “category_items” association endpoint.
 */
async function attachItemToCategoryOnClover(
  cloverItemId: string,
  cloverCategoryId: string
) {
  const associationPayload = {
    elements: [
      {
        item:     { id: cloverItemId },
        category: { id: cloverCategoryId },
      },
    ],
  };

  await cloverFetch(
    `/v3/merchants/${merchantId}/category_items`,
    {
      method: "POST",
      body: JSON.stringify(associationPayload),
    }
  );
}

/**
 * Main syncOne: 
 *   1) create/update the item (no category in that call),
 *   2) call category_items to link it to the correct category,
 *   3) then continue upserting/deleting modifier groups/choices, etc.
 */
export async function syncOne(itemId: string) {
  // 1. Fetch our MenuItem (including its local category → we need categoryCloverId)
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: {
      category: true, // so we can read category.cloverCategoryId
      optionGroups: {
        include: {
          choices: {
            include: {
              nestedOptionGroup: { include: { choices: true } },
            },
          },
        },
      },
    },
  });
  if (!item) throw new Error("MenuItem not found: " + itemId);

  // Extract categoryCloverId (must already exist in your DB)
  const categoryCloverId: string | null = item.category?.cloverCategoryId ?? null;

  // 2. Upsert (create or update) the item itself on Clover
  const cloverItemId = await upsertItem({
    id:           item.id,
    title:        item.title,
    price:        item.price,
    cloverItemId: item.cloverItemId,
  });

  // 3. Now that the item exists (cloverItemId), link it to its category
  if (categoryCloverId) {
    await attachItemToCategoryOnClover(cloverItemId, categoryCloverId);
  }

  //-------------------------------------------------------------------
  // At this point, the item is created/updated and attached to category.
  // Next: we still need to upsert/delete modifier groups & modifiers
  //-------------------------------------------------------------------

  // 4. Build “existing…” maps so we can diff & delete removed ones
  const existingGroups = await prisma.menuItemOptionGroup.findMany({
    where: { menuItemId: itemId },
  });
  const existingGroupsMap: Record<string, MenuItemOptionGroup> = {};
  existingGroups.forEach((g) => { existingGroupsMap[g.id] = g; });

  const existingChoices = await prisma.menuOptionChoice.findMany({
    where: { optionGroup: { menuItemId: itemId } },
  });
  const existingChoicesMap: Record<string, MenuOptionChoice> = {};
  existingChoices.forEach((c) => { existingChoicesMap[c.id] = c; });

  const existingNestedGroups = await prisma.nestedOptionGroup.findMany({
    where: { parentChoice: { optionGroup: { menuItemId: itemId } } },
  });
  const existingNestedGroupsMap: Record<string, NestedOptionGroup> = {};
  existingNestedGroups.forEach((ng) => { existingNestedGroupsMap[ng.id] = ng; });

  const existingNestedChoices = await prisma.nestedOptionChoice.findMany({
    where: { nestedGroup: { parentChoice: { optionGroup: { menuItemId: itemId } } } },
  });
  const existingNestedChoicesMap: Record<string, NestedOptionChoice> = {};
  existingNestedChoices.forEach((nc) => { existingNestedChoicesMap[nc.id] = nc; });

  // 5. Track which Clover IDs appear in the new payload
  const seenGroupIds: string[] = [];
  const seenModifierIds: string[] = [];
  const seenNestedGroupIds: string[] = [];
  const seenNestedModifierIds: string[] = [];

  // 6. Loop through each optionGroup → upsert group and its choices
  for (const group of item.optionGroups) {
    const existingGroup = existingGroupsMap[group.id];
    const oldCloverGroupId = existingGroup?.cloverGroupId ?? null;

    // 6.a Upsert modifier group on Clover
    const newCloverGroupId = await ensureModifierGroup(
      group.title,
      oldCloverGroupId
    );
    seenGroupIds.push(newCloverGroupId);

    // 6.b If this group was new, save its cloverGroupId back into Prisma
    if (oldCloverGroupId !== newCloverGroupId) {
      await prisma.menuItemOptionGroup.update({
        where: { id: group.id },
        data: { cloverGroupId: newCloverGroupId },
      });
    }

    // 6.c Loop over each choice under that group
    for (const choice of group.choices) {
      const existingChoice = existingChoicesMap[choice.id];
      const oldCloverModifierId = existingChoice?.cloverModifierId ?? null;

      if (choice.nestedOptionGroup) {
        // 6.c.i Upsert a nested modifier group under this choice
        const nested = choice.nestedOptionGroup as NestedOptionGroup & { choices: NestedOptionChoice[] };
        const nestedName = `${group.title} – ${choice.label}`;
        const oldNestedCloverGroupId = existingNestedGroupsMap[nested.id]?.cloverGroupId ?? null;

        // 6.c.i.a Create/update nested modifier group on Clover
        const newNestedCloverGroupId = await ensureModifierGroup(
          nestedName,
          oldNestedCloverGroupId
        );
        seenNestedGroupIds.push(newNestedCloverGroupId);

        // 6.c.i.b If newly created, save back to Prisma
        if (oldNestedCloverGroupId !== newNestedCloverGroupId) {
          await prisma.nestedOptionGroup.update({
            where: { id: nested.id },
            data: { cloverGroupId: newNestedCloverGroupId },
          });
        }

        // 6.c.i.c Loop nested choices → upsert each nested modifier
        for (const nc of nested.choices) {
          const existingNestedChoice = existingNestedChoicesMap[nc.id];
          const oldNestedCloverModifierId = existingNestedChoice?.cloverModifierId ?? null;

          const newNestedModifierId = await ensureModifier(
            newNestedCloverGroupId,
            nc.label,
            nc.priceAdjustment ?? 0,
            oldNestedCloverModifierId
          );
          seenNestedModifierIds.push(newNestedModifierId);

          if (oldNestedCloverModifierId !== newNestedModifierId) {
            await prisma.nestedOptionChoice.update({
              where: { id: nc.id },
              data: { cloverModifierId: newNestedModifierId },
            });
          }
        }

        // 6.c.i.d Delete any nested modifierChoices that were removed locally
        for (const existingNc of Object.values(existingNestedChoicesMap)) {
          if (
            existingNc.nestedGroupId === nested.id &&
            !nested.choices.some((c) => c.id === existingNc.id)
          ) {
            if (existingNc.cloverModifierId) {
              await cloverFetch(
                `/v3/merchants/${merchantId}/modifier_groups/${newNestedCloverGroupId}/modifiers/${existingNc.cloverModifierId}`,
                { method: "DELETE" }
              );
            }
            await prisma.nestedOptionChoice.delete({ where: { id: existingNc.id } });
          }
        }
      } else {
        // 6.c.ii Simple (non‐nested) modifier directly in the group
        const newModifierId = await ensureModifier(
          newCloverGroupId,
          choice.label,
          choice.priceAdjustment ?? 0,
          oldCloverModifierId
        );
        seenModifierIds.push(newModifierId);

        if (oldCloverModifierId !== newModifierId) {
          await prisma.menuOptionChoice.update({
            where: { id: choice.id },
            data: { cloverModifierId: newModifierId },
          });
        }
      }
    }

    // 6.d Delete any modifiers removed from this group
    for (const existingChoice of Object.values(existingChoicesMap)) {
      if (
        existingChoice.optionGroupId === group.id &&
        !group.choices.some((c) => c.id === existingChoice.id)
      ) {
        if (existingChoice.cloverModifierId) {
          await cloverFetch(
            `/v3/merchants/${merchantId}/modifier_groups/${newCloverGroupId}/modifiers/${existingChoice.cloverModifierId}`,
            { method: "DELETE" }
          );
        }
        await prisma.menuOptionChoice.delete({ where: { id: existingChoice.id } });
      }
    }
  }

  // 7. Delete any entire optionGroups that were removed locally
  for (const existingGroup of Object.values(existingGroupsMap)) {
    if (!item.optionGroups.some((g) => g.id === existingGroup.id)) {
      if (existingGroup.cloverGroupId) {
        await cloverFetch(
          `/v3/merchants/${merchantId}/modifier_groups/${existingGroup.cloverGroupId}`,
          { method: "DELETE" }
        );
      }
      await prisma.menuItemOptionGroup.delete({ where: { id: existingGroup.id } });
    }
  }

  // 8. Rebuild “item → modifier_groups” associations in Clover
  let currentlyLinkedGroupIds: string[] = [];
  let currentlyLinkedAssocIds: Record<string, string> = {};

  try {
    const currentAssoc = await cloverFetch<{
      elements: Array<{ id: string; modifierGroup: { id: string } }>;
    }>(`/v3/merchants/${merchantId}/items/${cloverItemId}/item_modifier_groups`);

    currentlyLinkedGroupIds = currentAssoc.elements.map((e) => e.modifierGroup.id);
    currentAssoc.elements.forEach((e) => {
      currentlyLinkedAssocIds[e.modifierGroup.id] = e.id;
    });
  } catch (err: any) {
    const msg = String(err.message || "");
    // Clover sometimes returns 405 on GET /item_modifier_groups if no associations exist
    if (msg.includes("405")) {
      currentlyLinkedGroupIds = [];
      currentlyLinkedAssocIds = {};
    } else {
      throw err;
    }
  }

  const allGroupsToLink = [...seenGroupIds, ...seenNestedGroupIds];

  // 8.a Attach newly seen groups
  for (const gId of allGroupsToLink) {
    if (!currentlyLinkedGroupIds.includes(gId)) {
      await cloverFetch(`/v3/merchants/${merchantId}/item_modifier_groups`, {
        method: "POST",
        body: JSON.stringify({
          elements: [ { item: { id: cloverItemId }, modifierGroup: { id: gId } } ]
        }),
      });
    }
  }

  // 8.b Detach groups no longer present
  for (const gId of currentlyLinkedGroupIds) {
    if (!allGroupsToLink.includes(gId)) {
      const assocId = currentlyLinkedAssocIds[gId];
      await cloverFetch(
        `/v3/merchants/${merchantId}/item_modifier_groups/${assocId}`,
        { method: "DELETE" }
      );
    }
  }

  // 9. Finally, push stock (errors don’t block modifiers)
  try {
    await pushStockToClover(item.id, item.stock);
  } catch (e: any) {
    console.error("Failed to push stock (continuing modifier sync):", e);
  }
}

/* ─────────────────── Bulk sync helper ─────────────────── */
export async function syncAllMenuItems() {
  const ids = await prisma.menuItem.findMany({ select: { id: true } });
  for (const { id } of ids) {
    try {
      await syncOne(id);
    } catch (err) {
      console.error("Sync error for menu item", id, err);
    }
  }
  return { success: true, count: ids.length };
}
