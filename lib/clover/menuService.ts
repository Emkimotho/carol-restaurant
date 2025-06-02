/* ------------------------------------------------------------------ */
/*  File: lib/clover/menuService.ts                                    */
/* ------------------------------------------------------------------ 
   • syncOne(itemId)  – push a single MenuItem (plus flat & nested
     modifiers) to Clover V3, performing a true diff-and-apply so that
     existing groups/modifiers are updated or deleted rather than
     recreated each time.
   • syncAllMenuItems() – convenience bulk-sync for every item
   ------------------------------------------------------------------ */

import {
  PrismaClient,
  MenuItem,
  MenuItemOptionGroup,
  MenuOptionChoice,
  NestedOptionGroup,
  NestedOptionChoice,
} from "@prisma/client";
import { cloverFetch, getCloverConfig } from "../cloverClient";

const prisma = new PrismaClient();
const { merchantId } = getCloverConfig();

/* ─────────────────────────  Helpers  ───────────────────────── */
// Convert a dollar amount (e.g. 12.50) into integer cents (e.g. 1250).
const cents = (d: number) => Math.round(d * 100);

// Build the payload for a MenuItem itself (name + price in cents)
const itemPayload = (item: MenuItem) => ({
  name:    item.title,
  price:   cents(item.price),
  taxable: true,
});

// Build the payload for a single modifier (label + price in cents)
const modPayload = (label: string, priceAdj: number | null, hasNested: boolean) => ({
  name:  label,
  price: hasNested ? 0 : cents(priceAdj ?? 0),
});

/* ─────────────────  Upsert or Delete Groups & Modifiers  ───────────────── */
/**
 * If `cloverGroupId` exists, send PUT to update its name; otherwise POST to create.
 * Returns the resulting Clover group ID.
 */
async function ensureModifierGroup(title: string, cloverGroupId: string | null): Promise<string> {
  if (cloverGroupId) {
    // Update existing group’s name
    await cloverFetch(`/v3/merchants/${merchantId}/modifier_groups/${cloverGroupId}`, {
      method: "PUT",
      body: JSON.stringify({ name: title }),
    });
    return cloverGroupId;
  } else {
    // Create brand-new modifier group
    const { id: newId } = await cloverFetch<{ id: string }>(
      `/v3/merchants/${merchantId}/modifier_groups`,
      { method: "POST", body: JSON.stringify({ name: title }) }
    );
    return newId;
  }
}

/**
 * If `cloverModifierId` exists, send PUT to update label/price; otherwise POST to create.
 * Returns the resulting Clover modifier ID.
 */
async function ensureModifier(
  groupId: string,
  label: string,
  priceAdj: number | null,
  cloverModifierId: string | null
): Promise<string> {
  const payload = modPayload(label, priceAdj, false);
  if (cloverModifierId) {
    // Update existing modifier
    await cloverFetch(
      `/v3/merchants/${merchantId}/modifier_groups/${groupId}/modifiers/${cloverModifierId}`,
      { method: "PUT", body: JSON.stringify(payload) }
    );
    return cloverModifierId;
  } else {
    // Create brand-new modifier
    const { id: newId } = await cloverFetch<{ id: string }>(
      `/v3/merchants/${merchantId}/modifier_groups/${groupId}/modifiers`,
      { method: "POST", body: JSON.stringify(payload) }
    );
    return newId;
  }
}

/* ─────────────────  Item upsert  ───────────────── */
/**
 * If `item.cloverItemId` exists, send PUT to update the item; otherwise POST to create.
 * Returns the resulting Clover item ID.
 */
async function upsertItem(item: MenuItem): Promise<string> {
  const path = item.cloverItemId
    ? `/v3/merchants/${merchantId}/items/${item.cloverItemId}`
    : `/v3/merchants/${merchantId}/items`;
  const method = item.cloverItemId ? "PUT" : "POST";

  const { id } = await cloverFetch<{ id: string }>(path, {
    method,
    body: JSON.stringify(itemPayload(item)),
  });

  if (!item.cloverItemId) {
    // Save the newly created cloverItemId back into Prisma
    await prisma.menuItem.update({
      where: { id: item.id },
      data: { cloverItemId: id },
    });
  }
  return item.cloverItemId ?? id;
}

/* ─────────────────  Sync a single MenuItem  ───────────────── */
export async function syncOne(itemId: string) {
  // 1. Fetch the MenuItem (and all nested option groups/choices) from Prisma
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: {
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

  // 2. Upsert the MenuItem itself in Clover
  const cloverItemId = await upsertItem(item);

  /** 
   * 3. Build maps of existing Prisma rows (so we can delete any that the user removed)
   *    • existingGroupsMap:     groupId → MenuItemOptionGroup row
   *    • existingChoicesMap:    choiceId → MenuOptionChoice row
   *    • existingNestedGroupsMap: nestedGroupId → NestedOptionGroup row
   *    • existingNestedChoicesMap: nestedChoiceId → NestedOptionChoice row
   */
  const existingGroups = await prisma.menuItemOptionGroup.findMany({
    where: { menuItemId: itemId },
  });
  const existingGroupsMap: Record<string, MenuItemOptionGroup> = {};
  existingGroups.forEach((g) => {
    existingGroupsMap[g.id] = g;
  });

  const existingChoices = await prisma.menuOptionChoice.findMany({
    where: { optionGroup: { menuItemId: itemId } },
  });
  const existingChoicesMap: Record<string, MenuOptionChoice> = {};
  existingChoices.forEach((c) => {
    existingChoicesMap[c.id] = c;
  });

  const existingNestedGroups = await prisma.nestedOptionGroup.findMany({
    where: {
      parentChoice: { optionGroup: { menuItemId: itemId } },
    },
  });
  const existingNestedGroupsMap: Record<string, NestedOptionGroup> = {};
  existingNestedGroups.forEach((ng) => {
    existingNestedGroupsMap[ng.id] = ng;
  });

  const existingNestedChoices = await prisma.nestedOptionChoice.findMany({
    where: {
      nestedGroup: { parentChoice: { optionGroup: { menuItemId: itemId } } },
    },
  });
  const existingNestedChoicesMap: Record<string, NestedOptionChoice> = {};
  existingNestedChoices.forEach((nc) => {
    existingNestedChoicesMap[nc.id] = nc;
  });

  // 4. Keep track of which Clover IDs we see in the new payload
  const seenGroupIds: string[] = [];
  const seenModifierIds: string[] = [];
  const seenNestedGroupIds: string[] = [];
  const seenNestedModifierIds: string[] = [];

  // 5. Loop over each incoming option-group from the client and upsert it
  for (const group of item.optionGroups) {
    // 5.a. Grab the Prisma row (if it exists) and its stored cloverGroupId
    const existingGroup = existingGroupsMap[group.id];
    const title = group.title;
    const oldCloverGroupId = existingGroup?.cloverGroupId ?? null;

    // 5.b. Upsert that modifier group in Clover
    const newCloverGroupId = await ensureModifierGroup(title, oldCloverGroupId);
    seenGroupIds.push(newCloverGroupId);

    // 5.c. If this was a brand-new group, save its cloverGroupId in Prisma
    if (oldCloverGroupId !== newCloverGroupId) {
      await prisma.menuItemOptionGroup.update({
        where: { id: group.id },
        data: { cloverGroupId: newCloverGroupId },
      });
    }

    // 5.d. Now handle each “choice” inside that group
    for (const choice of group.choices) {
      const existingChoice = existingChoicesMap[choice.id];
      const oldCloverModifierId = existingChoice?.cloverModifierId ?? null;

      if (choice.nestedOptionGroup) {
        // 5.d.i. When there’s a nestedOptionGroup, it’s its own Clover modifier_group
        const nested = choice.nestedOptionGroup as NestedOptionGroup & { choices: NestedOptionChoice[] };
        const nestedName = `${title} – ${choice.label}`;
        const oldNestedCloverGroupId = existingNestedGroupsMap[nested.id]?.cloverGroupId ?? null;

        // Upsert that nested modifier group
        const newNestedCloverGroupId = await ensureModifierGroup(nestedName, oldNestedCloverGroupId);
        seenNestedGroupIds.push(newNestedCloverGroupId);

        // If it was newly created, update Prisma
        if (oldNestedCloverGroupId !== newNestedCloverGroupId) {
          await prisma.nestedOptionGroup.update({
            where: { id: nested.id },
            data: { cloverGroupId: newNestedCloverGroupId },
          });
        }

        // 5.d.i.c. Now upsert all nested choices under that nested group
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

        // 5.d.i.d. Delete any nested‐choices that the user removed
        for (const existingNc of Object.values(existingNestedChoicesMap)) {
          if (
            existingNc.nestedGroupId === nested.id &&
            !nested.choices.some((c: { id: string }) => c.id === existingNc.id)
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
        // 5.d.ii. Simple (non-nested) modifier directly under the main group
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
    } // end loop over choices

    // 5.e. Delete any modifiers that the user removed from this group
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
  } // end loop over optionGroups

  // 6. Delete any entire option-groups that the user removed
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

  // 7. Rebuild the item→modifier_group associations in Clover
  const currentAssoc = await cloverFetch<{
    elements: Array<{ id: string; modifierGroup: { id: string } }>;
  }>(`/v3/merchants/${merchantId}/items/${cloverItemId}/item_modifier_groups`);

  const currentlyLinkedGroupIds = currentAssoc.elements.map((e) => e.modifierGroup.id);
  const currentlyLinkedAssocIds: Record<string, string> = {};
  currentAssoc.elements.forEach((e) => {
    currentlyLinkedAssocIds[e.modifierGroup.id] = e.id;
  });

  // 7.a. Attach any newly seen groups that aren’t already linked
  for (const gId of seenGroupIds) {
    if (!currentlyLinkedGroupIds.includes(gId)) {
      await cloverFetch(`/v3/merchants/${merchantId}/item_modifier_groups`, {
        method: "POST",
        body: JSON.stringify({
          elements: [{ item: { id: cloverItemId }, modifierGroup: { id: gId } }],
        }),
      });
    }
  }

  // 7.b. Detach any groups that were previously linked but no longer present
  for (const gId of currentlyLinkedGroupIds) {
    if (!seenGroupIds.includes(gId)) {
      const assocId = currentlyLinkedAssocIds[gId];
      await cloverFetch(
        `/v3/merchants/${merchantId}/item_modifier_groups/${assocId}`,
        { method: "DELETE" }
      );
    }
  }
}

/* ─────────────────  Bulk sync helper  ───────────────── */
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
