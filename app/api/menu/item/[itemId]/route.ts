/* ------------------------------------------------------------------ */
/*  File: app/api/menu/item/[itemId]/route.ts                         */
/* ------------------------------------------------------------------ */
/*  • GET    /api/menu/item/:itemId                                   */
/*  • PUT    /api/menu/item/:itemId                                   */
/*  • DELETE /api/menu/item/:itemId                                   */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { syncOne }      from "@/lib/clover/menuService";

/* ================================================================== */
/*  GET  /api/menu/item/:itemId                                       */
/* ================================================================== */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await ctx.params;
  try {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: {
        category: true,
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

    if (!menuItem) {
      return NextResponse.json({ message: "Menu item not found" }, { status: 404 });
    }
    return NextResponse.json({ menuItem }, { status: 200 });
  } catch (error) {
    console.error("Error fetching menu item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/* ================================================================== */
/*  PUT  /api/menu/item/:itemId                                       */
/* ================================================================== */
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await ctx.params;

  // 1. Parse & validate JSON body
  let body: any = null;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 }
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { message: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  try {
    /* -------- scalar field patch ---------------------------------- */
    const updateData: {
      title?: string;
      description?: string;
      price?: number;
      image?: string;
      hasSpiceLevel?: boolean;
      showInGolfMenu?: boolean;
      categoryId?: string;
      cloverItemId?: string;
      stock?: number;
      isAlcohol?: boolean;
    } = {};

    if (body.title          !== undefined) updateData.title          = String(body.title).trim();
    if (body.description    !== undefined) updateData.description    = String(body.description);
    if (body.price          !== undefined) updateData.price          = Number(body.price);
    if (body.image          !== undefined) updateData.image          = String(body.image);
    if (body.hasSpiceLevel  !== undefined) updateData.hasSpiceLevel  = Boolean(body.hasSpiceLevel);
    if (body.showInGolfMenu !== undefined) updateData.showInGolfMenu = Boolean(body.showInGolfMenu);
    if (body.categoryId     !== undefined) updateData.categoryId     = String(body.categoryId);
    if (body.cloverItemId   !== undefined) updateData.cloverItemId   = String(body.cloverItemId);
    if (body.stock          !== undefined) updateData.stock          = Number(body.stock);
    if (body.hasAlcohol     !== undefined) updateData.isAlcohol      = Boolean(body.hasAlcohol);

    /* -------- normalize incoming optionGroups data ---------------- */
    type IncomingNestedChoice = {
      id?: string;
      label: string;
      priceAdjustment?: number;
    };
    type IncomingNestedGroup = {
      id?: string;
      title: string;
      /** Prisma schema: minRequired Int (non‐nullable) */
      minRequired?: number;
      /** Prisma schema: maxAllowed Int? (nullable) */
      maxAllowed?: number;
      choices: IncomingNestedChoice[];
    };

    type IncomingChoice = {
      id?: string;
      label: string;
      priceAdjustment?: number;
      nestedOptionGroup?: IncomingNestedGroup;
    };

    type IncomingGroup = {
      id?: string;
      title: string;
      /** Prisma schema: minRequired Int (non‐nullable) */
      minRequired?: number;
      /** Prisma schema: maxAllowed Int? (nullable) */
      maxAllowed?: number;
      /** Prisma schema: optionType String (non‐nullable) */
      optionType?: string;
      choices: IncomingChoice[];
    };

    const incomingGroups: IncomingGroup[] = Array.isArray(body.optionGroups)
      ? body.optionGroups
      : [];

    // 2. Fetch existing optionGroups from DB (including nested choices)
    const existingGroups = await prisma.menuItemOptionGroup.findMany({
      where: { menuItemId: itemId },
      include: {
        choices: {
          include: {
            nestedOptionGroup: {
              include: { choices: true },
            },
          },
        },
      },
    });

    // 3. Determine which groups to delete (present in DB, absent in incoming)
    const incomingGroupIds = incomingGroups
      .map((g) => (typeof g.id === "string" ? g.id : null))
      .filter((gId): gId is string => gId !== null);
    const groupsToDelete = existingGroups
      .filter((eg) => !incomingGroupIds.includes(eg.id))
      .map((eg) => eg.id);

    // 4. Determine which groups to create (incoming without an id)
    const groupsToCreate = incomingGroups.filter((g) => !g.id);

    // 5. Determine which groups to update (incoming with id)
    const groupsToUpdate = incomingGroups.filter((g) => typeof g.id === "string") as Array<IncomingGroup & { id: string }>;

    // 6. Process deletions (delete nested choices, nested groups, choices, then group)
    for (const deleteGroupId of groupsToDelete) {
      await prisma.$transaction([
        // 6a. Delete nested option choices for any nested groups under this group
        prisma.nestedOptionChoice.deleteMany({
          where: {
            // Traverse relation: NestedOptionChoice.nestedGroup.parentChoice.optionGroupId = deleteGroupId
            nestedGroup: {
              parentChoice: {
                optionGroup: { id: deleteGroupId },
              },
            },
          },
        }),
        // 6b. Delete nested option groups under this group
        prisma.nestedOptionGroup.deleteMany({
          where: {
            parentChoice: {
              optionGroup: { id: deleteGroupId },
            },
          },
        }),
        // 6c. Delete menu option choices (no nested) under this group
        prisma.menuOptionChoice.deleteMany({
          where: { optionGroupId: deleteGroupId },
        }),
        // 6d. Delete the option group itself
        prisma.menuItemOptionGroup.delete({
          where: { id: deleteGroupId },
        }),
      ]);
    }

    // 7. Process creations (incoming without id)
    for (const group of groupsToCreate) {
      // 7a. Create the new MenuItemOptionGroup
      const newGroup = await prisma.menuItemOptionGroup.create({
        data: {
          menuItemId:   itemId,
          title:        group.title,
          minRequired:  group.minRequired !== undefined ? group.minRequired : 0,
          maxAllowed:   group.maxAllowed  !== undefined ? group.maxAllowed  : null,
          optionType:   group.optionType  !== undefined ? group.optionType  : "",
        },
      });

      // 7b. Create each MenuOptionChoice under this new group
      for (const choice of group.choices) {
        if (choice.nestedOptionGroup) {
          // 7b.i. Create the MenuOptionChoice first (no nested relation)
          const createdChoice = await prisma.menuOptionChoice.create({
            data: {
              optionGroupId:   newGroup.id,
              label:           choice.label,
              priceAdjustment: choice.priceAdjustment ?? 0,
            },
          });

          // 7b.ii. Create the NestedOptionGroup using parentChoiceId
          const nested = choice.nestedOptionGroup;
          const createdNestedGroup = await prisma.nestedOptionGroup.create({
            data: {
              parentChoiceId: createdChoice.id,
              title:          nested.title,
              minRequired:    nested.minRequired !== undefined ? nested.minRequired : 0,
              maxAllowed:     nested.maxAllowed  !== undefined ? nested.maxAllowed  : null,
            },
          });

          // 7b.iii. Create NestedOptionChoice entries under that nested group
          for (const nc of nested.choices) {
            await prisma.nestedOptionChoice.create({
              data: {
                nestedGroupId:    createdNestedGroup.id,
                label:            nc.label,
                priceAdjustment:  nc.priceAdjustment ?? 0,
              },
            });
          }
        } else {
          // 7b.iv. Simple choice with no nested group
          await prisma.menuOptionChoice.create({
            data: {
              optionGroupId:   newGroup.id,
              label:           choice.label,
              priceAdjustment: choice.priceAdjustment ?? 0,
            },
          });
        }
      }
    }

    // 8. Process updates (incoming with id)
    for (const group of groupsToUpdate) {
      // 8a. Update the MenuItemOptionGroup itself
      await prisma.menuItemOptionGroup.update({
        where: { id: group.id },
        data:  {
          title:       group.title,
          minRequired: group.minRequired !== undefined ? group.minRequired : 0,
          maxAllowed:  group.maxAllowed  !== undefined ? group.maxAllowed  : null,
          optionType:  group.optionType  !== undefined ? group.optionType  : "",
        },
      });

      // 8b. Fetch existing MenuOptionChoice for this group (including nested relation)
      const existingChoices = await prisma.menuOptionChoice.findMany({
        where: { optionGroupId: group.id },
        include: { nestedOptionGroup: { include: { choices: true } } },
      });

      const incomingChoices = group.choices;

      // 8c. Delete MenuOptionChoice entries that are no longer present
      const incomingChoiceIds = incomingChoices
        .map((c) => (typeof c.id === "string" ? c.id : null))
        .filter((cId): cId is string => cId !== null);
      const choicesToDelete = existingChoices
        .filter((ec) => !incomingChoiceIds.includes(ec.id))
        .map((ec) => ec.id);

      for (const choiceId of choicesToDelete) {
        await prisma.$transaction([
          // Delete any NestedOptionChoice belonging to the nested group of this choice
          prisma.nestedOptionChoice.deleteMany({
            where: {
              nestedGroup: {
                parentChoice: { id: choiceId },
              },
            },
          }),
          // Delete the NestedOptionGroup if it exists
          prisma.nestedOptionGroup.deleteMany({
            where: { parentChoiceId: choiceId },
          }),
          // Delete the MenuOptionChoice itself
          prisma.menuOptionChoice.delete({
            where: { id: choiceId },
          }),
        ]);
      }

      // 8d. Create new MenuOptionChoice entries (incoming with no id)
      for (const choice of incomingChoices.filter((c) => !c.id)) {
        if (choice.nestedOptionGroup) {
          // 8d.i. Create the MenuOptionChoice first
          const newChoice = await prisma.menuOptionChoice.create({
            data: {
              optionGroupId:   group.id,
              label:           choice.label,
              priceAdjustment: choice.priceAdjustment ?? 0,
            },
          });

          // 8d.ii. Create the NestedOptionGroup linked by parentChoiceId
          const nested = choice.nestedOptionGroup;
          const newNested = await prisma.nestedOptionGroup.create({
            data: {
              parentChoiceId: newChoice.id,
              title:          nested.title,
              minRequired:    nested.minRequired !== undefined ? nested.minRequired : 0,
              maxAllowed:     nested.maxAllowed  !== undefined ? nested.maxAllowed  : null,
            },
          });

          // 8d.iii. Create NestedOptionChoice entries under that nested group
          for (const nc of nested.choices) {
            await prisma.nestedOptionChoice.create({
              data: {
                nestedGroupId:    newNested.id,
                label:            nc.label,
                priceAdjustment:  nc.priceAdjustment ?? 0,
              },
            });
          }
        } else {
          // 8d.iv. Simple choice with no nested group
          await prisma.menuOptionChoice.create({
            data: {
              optionGroupId:   group.id,
              label:           choice.label,
              priceAdjustment: choice.priceAdjustment ?? 0,
            },
          });
        }
      }

      // 8e. Update existing MenuOptionChoice entries (incoming with id)
      for (
        const choice of (incomingChoices.filter(
          (c) => typeof c.id === "string"
        ) as Array<IncomingChoice & { id: string }>)
      ) {
        // 8e.i. Update the MenuOptionChoice fields
        await prisma.menuOptionChoice.update({
          where: { id: choice.id },
          data:  {
            label:           choice.label,
            priceAdjustment: choice.priceAdjustment ?? 0,
          },
        });

        // 8e.ii. Handle any nestedOptionGroup logic
        if (choice.nestedOptionGroup) {
          const ng = choice.nestedOptionGroup;
          if (ng.id) {
            // 8e.ii.a. Update the existing NestedOptionGroup
            await prisma.nestedOptionGroup.update({
              where: { id: ng.id },
              data:  {
                title:       ng.title,
                minRequired: ng.minRequired !== undefined ? ng.minRequired : 0,
                maxAllowed:  ng.maxAllowed  !== undefined ? ng.maxAllowed  : null,
              },
            });

            // 8e.ii.b. Fetch existing NestedOptionChoice for that nested group
            const existingNestedChoices = await prisma.nestedOptionChoice.findMany({
              where: { nestedGroupId: ng.id },
            });

            const incomingNestedChoices = ng.choices;

            // 8e.ii.c. Delete NestedOptionChoice not in incoming
            const incomingNestedIds = incomingNestedChoices
              .map((nc) => (typeof nc.id === "string" ? nc.id : null))
              .filter((ncId): ncId is string => ncId !== null);

            const nestedToDelete = existingNestedChoices
              .filter((enc) => !incomingNestedIds.includes(enc.id))
              .map((enc) => enc.id);

            for (const delId of nestedToDelete) {
              await prisma.nestedOptionChoice.delete({
                where: { id: delId },
              });
            }

            // 8e.ii.d. Create new NestedOptionChoice
            for (const nc of incomingNestedChoices.filter((nc) => !nc.id)) {
              await prisma.nestedOptionChoice.create({
                data: {
                  nestedGroupId:    ng.id,
                  label:            nc.label,
                  priceAdjustment:  nc.priceAdjustment ?? 0,
                },
              });
            }

            // 8e.ii.e. Update existing NestedOptionChoice
            for (
              const nc of (incomingNestedChoices.filter(
                (nc) => typeof nc.id === "string"
              ) as Array<IncomingNestedChoice & { id: string }>)
            ) {
              await prisma.nestedOptionChoice.update({
                where: { id: nc.id },
                data:  {
                  label:           nc.label,
                  priceAdjustment: nc.priceAdjustment ?? 0,
                },
              });
            }
          } else {
            // 8e.ii.f. Nested group has no id ⇒ create a new NestedOptionGroup
            const newNested = await prisma.nestedOptionGroup.create({
              data: {
                parentChoiceId: choice.id,
                title:          ng.title,
                minRequired:    ng.minRequired !== undefined ? ng.minRequired : 0,
                maxAllowed:     ng.maxAllowed  !== undefined ? ng.maxAllowed  : null,
              },
            });

            for (const nc of ng.choices) {
              await prisma.nestedOptionChoice.create({
                data: {
                  nestedGroupId:    newNested.id,
                  label:            nc.label,
                  priceAdjustment:  nc.priceAdjustment ?? 0,
                },
              });
            }
          }
        } else {
          // 8e.ii.g. Incoming has no nestedOptionGroup but DB choice had one ⇒ delete it
          const dbChoice = await prisma.menuOptionChoice.findUnique({
            where: { id: choice.id },
            include: { nestedOptionGroup: true },
          });
          if (dbChoice?.nestedOptionGroup) {
            await prisma.$transaction([
              prisma.nestedOptionChoice.deleteMany({
                where: { nestedGroupId: dbChoice.nestedOptionGroup.id },
              }),
              prisma.nestedOptionGroup.delete({
                where: { id: dbChoice.nestedOptionGroup.id },
              }),
            ]);
          }
        }
      }
    }

    // 9. Finally, update the menuItem’s main fields
    const updatedItem = await prisma.menuItem.update({
      where: { id: itemId },
      data:  {
        ...updateData,
      },
      include: {
        category: true,
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

    // 10. Sync this single item to Clover to upsert remote modifiers/groups
    try {
      await syncOne(itemId);
    } catch (syncErr) {
      console.error("Error syncing to Clover after update:", syncErr);
      // Do not fail the entire request—database changes have already been applied
    }

    return NextResponse.json({ menuItem: updatedItem }, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating menu item ${itemId}:`, error);
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Menu item not found" }, { status: 404 });
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/* ================================================================== */
/*  DELETE /api/menu/item/:itemId                                     */
/* ================================================================== */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await ctx.params;
  try {
    await prisma.$transaction([
      prisma.nestedOptionChoice.deleteMany({
        where: {
          nestedGroup: {
            parentChoice: {
              optionGroup: { menuItemId: itemId },
            },
          },
        },
      }),
      prisma.nestedOptionGroup.deleteMany({
        where: {
          parentChoice: {
            optionGroup: { menuItemId: itemId },
          },
        },
      }),
      prisma.menuOptionChoice.deleteMany({
        where: { optionGroup: { menuItemId: itemId } },
      }),
      prisma.menuItemOptionGroup.deleteMany({
        where: { menuItemId: itemId },
      }),
      prisma.menuItem.delete({
        where: { id: itemId },
      }),
    ]);

    return NextResponse.json(
      { message: "Menu item and related data deleted" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error(`Error deleting menu item ${itemId}:`, error);
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Menu item not found" }, { status: 404 });
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
