/* ------------------------------------------------------------------
   File: lib/clover/flattenForClover.ts
   ------------------------------------------------------------------
   Helper that “flattens” a rich MenuItem tree into the shape Clover
   expects: an array of { title, choices[] } with NO nested groups.
   ------------------------------------------------------------------ */

import {
  MenuItem,
  MenuItemOptionGroup,
  MenuOptionChoice,
  NestedOptionGroup,
  NestedOptionChoice,
} from "@prisma/client";

/** Flat representation we will actually POST to Clover */
export interface FlatGroup {
  title: string;
  cloverGroupId: string | null;
  choices: {
    label: string;
    price: number; // dollars (not cents!)
    cloverModifierId: string | null;
  }[];
}

/**
 * Given a MenuItem (with optionGroups → choices → nestedOptionGroup),
 * return an array of FlatGroup objects.
 */
export function flattenForClover(item: MenuItem & {
  optionGroups: (MenuItemOptionGroup & {
    choices: (MenuOptionChoice & {
      nestedOptionGroup: (NestedOptionGroup & {
        choices: NestedOptionChoice[];
      }) | null;
    })[];
  })[];
}): FlatGroup[] {
  const groups: FlatGroup[] = [];

  for (const og of item.optionGroups) {
    /* 1) the top‑level group itself */
    groups.push({
      title: og.title,
      cloverGroupId: og.cloverGroupId,
      choices: og.choices.map((c) => ({
        label: c.label,
        price: c.priceAdjustment ?? 0,
        cloverModifierId: c.cloverModifierId,
      })),
    });

    /* 2) optional second group derived from each choice with a nested group */
    for (const c of og.choices) {
      if (!c.nestedOptionGroup) continue;

      const ng = c.nestedOptionGroup;
      groups.push({
        title: `${og.title} – ${c.label}`,
        cloverGroupId: ng.cloverGroupId,
        choices: ng.choices.map((nc) => ({
          label: nc.label,
          price: nc.priceAdjustment ?? 0,
          cloverModifierId: nc.cloverModifierId,
        })),
      });
    }
  }

  return groups;
}
