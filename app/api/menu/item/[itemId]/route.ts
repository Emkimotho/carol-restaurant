/* ------------------------------------------------------------------ */
/*  File: app/api/menu/item/[itemId]/route.ts                         */
/* ------------------------------------------------------------------ */
/*  • GET    /api/menu/item/:itemId                                   */
/*  • PUT    /api/menu/item/:itemId                                   */
/*  • DELETE /api/menu/item/:itemId  ← now also deletes modifier groups */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import { syncOne }      from "@/lib/clover/menuService";
import { cloverFetch, getCloverConfig } from "@/lib/cloverClient";

const { merchantId } = getCloverConfig();

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
      hasSpiceLevel?: boolean;
      showInGolfMenu?: boolean;
      categoryId?: string;
      stock?: number;
      isAlcohol?: boolean;
      cloudinaryPublicId?: string;
      imageUrl?: string;
    } = {};

    if (body.title          !== undefined) updateData.title          = String(body.title).trim();
    if (body.description    !== undefined) updateData.description    = String(body.description);
    if (body.price          !== undefined) updateData.price          = Number(body.price);
    if (body.hasSpiceLevel  !== undefined) updateData.hasSpiceLevel  = Boolean(body.hasSpiceLevel);
    if (body.showInGolfMenu !== undefined) updateData.showInGolfMenu = Boolean(body.showInGolfMenu);
    if (body.categoryId     !== undefined) updateData.categoryId     = String(body.categoryId);
    if (body.stock          !== undefined) updateData.stock          = Number(body.stock);
    if (body.isAlcohol      !== undefined) updateData.isAlcohol      = Boolean(body.isAlcohol);

    // **New**: handle Cloudinary image fields
    if (body.cloudinaryPublicId !== undefined) updateData.cloudinaryPublicId = String(body.cloudinaryPublicId);
    if (body.imageUrl           !== undefined) updateData.imageUrl           = String(body.imageUrl);

    /* -------- normalize incoming optionGroups data ---------------- */
    type IncomingNestedChoice = {
      id?: string;
      label: string;
      priceAdjustment?: number;
    };
    type IncomingNestedGroup = {
      id?: string;
      title: string;
      minRequired?: number;
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
      minRequired?: number;
      maxAllowed?: number;
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
            nestedOptionGroup: { include: { choices: true } },
          },
        },
      },
    });

    // 3. Determine which groups to delete
    const incomingGroupIds = incomingGroups
      .map((g) => (typeof g.id === "string" ? g.id : null))
      .filter((gId): gId is string => gId !== null);
    const groupsToDelete = existingGroups
      .filter((eg) => !incomingGroupIds.includes(eg.id))
      .map((eg) => eg.id);

    // 4. Determine which groups to create
    const groupsToCreate = incomingGroups.filter((g) => !g.id);

    // 5. Determine which groups to update
    const groupsToUpdate = incomingGroups.filter(
      (g): g is IncomingGroup & { id: string } => typeof g.id === "string"
    );

    // 6. Process deletions
    for (const deleteGroupId of groupsToDelete) {
      await prisma.$transaction([
        prisma.nestedOptionChoice.deleteMany({
          where: {
            nestedGroup: {
              parentChoice: { optionGroup: { id: deleteGroupId } },
            },
          },
        }),
        prisma.nestedOptionGroup.deleteMany({
          where: { parentChoice: { optionGroup: { id: deleteGroupId } } },
        }),
        prisma.menuOptionChoice.deleteMany({
          where: { optionGroupId: deleteGroupId },
        }),
        prisma.menuItemOptionGroup.delete({
          where: { id: deleteGroupId },
        }),
      ]);
    }

    // 7. Process creations
    for (const group of groupsToCreate) {
      const newGroup = await prisma.menuItemOptionGroup.create({
        data: {
          menuItemId:  itemId,
          title:       group.title,
          minRequired: group.minRequired ?? 0,
          maxAllowed:  group.maxAllowed  ?? null,
          optionType:  group.optionType  ?? "",
        },
      });

      for (const choice of group.choices) {
        if (choice.nestedOptionGroup) {
          const createdChoice = await prisma.menuOptionChoice.create({
            data: {
              optionGroupId:   newGroup.id,
              label:           choice.label,
              priceAdjustment: choice.priceAdjustment ?? 0,
            },
          });
          const nested = choice.nestedOptionGroup;
          const createdNestedGroup = await prisma.nestedOptionGroup.create({
            data: {
              parentChoiceId: createdChoice.id,
              title:          nested.title,
              minRequired:    nested.minRequired ?? 0,
              maxAllowed:     nested.maxAllowed  ?? null,
            },
          });
          for (const nc of nested.choices) {
            await prisma.nestedOptionChoice.create({
              data: {
                nestedGroupId:   createdNestedGroup.id,
                label:           nc.label,
                priceAdjustment: nc.priceAdjustment ?? 0,
              },
            });
          }
        } else {
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

    // 8. Process updates
    for (const group of groupsToUpdate) {
      await prisma.menuItemOptionGroup.update({
        where: { id: group.id },
        data:  {
          title:       group.title,
          minRequired: group.minRequired ?? 0,
          maxAllowed:  group.maxAllowed  ?? null,
          optionType:  group.optionType  ?? "",
        },
      });

      const existingChoices = await prisma.menuOptionChoice.findMany({
        where: { optionGroupId: group.id },
        include: { nestedOptionGroup: { include: { choices: true } } },
      });
      const incomingChoices = group.choices;

      const incomingChoiceIds = incomingChoices
        .map((c) => (typeof c.id === "string" ? c.id : null))
        .filter((cId): cId is string => cId !== null);
      const choicesToDelete = existingChoices
        .filter((ec) => !incomingChoiceIds.includes(ec.id))
        .map((ec) => ec.id);

      for (const choiceId of choicesToDelete) {
        await prisma.$transaction([
          prisma.nestedOptionChoice.deleteMany({
            where: { nestedGroup: { parentChoice: { id: choiceId } } },
          }),
          prisma.nestedOptionGroup.deleteMany({
            where: { parentChoiceId: choiceId },
          }),
          prisma.menuOptionChoice.delete({ where: { id: choiceId } }),
        ]);
      }

      // Create or update each incoming choice
      for (const choice of incomingChoices) {
        if (!choice.id) {
          if (choice.nestedOptionGroup) {
            const newChoice = await prisma.menuOptionChoice.create({
              data: {
                optionGroupId:   group.id,
                label:           choice.label,
                priceAdjustment: choice.priceAdjustment ?? 0,
              },
            });
            const nested = choice.nestedOptionGroup;
            const newNested = await prisma.nestedOptionGroup.create({
              data: {
                parentChoiceId: newChoice.id,
                title:          nested.title,
                minRequired:    nested.minRequired ?? 0,
                maxAllowed:     nested.maxAllowed  ?? null,
              },
            });
            for (const nc of nested.choices) {
              await prisma.nestedOptionChoice.create({
                data: {
                  nestedGroupId:   newNested.id,
                  label:           nc.label,
                  priceAdjustment: nc.priceAdjustment ?? 0,
                },
              });
            }
          } else {
            await prisma.menuOptionChoice.create({
              data: {
                optionGroupId:   group.id,
                label:           choice.label,
                priceAdjustment: choice.priceAdjustment ?? 0,
              },
            });
          }
        } else {
          await prisma.menuOptionChoice.update({
            where: { id: choice.id },
            data:  {
              label:           choice.label,
              priceAdjustment: choice.priceAdjustment ?? 0,
            },
          });

          const ng = choice.nestedOptionGroup;
          const dbChoice = await prisma.menuOptionChoice.findUnique({
            where: { id: choice.id },
            include: { nestedOptionGroup: true },
          });

          if (ng) {
            if (ng.id && dbChoice?.nestedOptionGroup) {
              await prisma.nestedOptionGroup.update({
                where: { id: ng.id },
                data:  {
                  title:       ng.title,
                  minRequired: ng.minRequired ?? 0,
                  maxAllowed:  ng.maxAllowed  ?? null,
                },
              });

              const existingNested = await prisma.nestedOptionChoice.findMany({
                where: { nestedGroupId: ng.id },
              });
              const incomingNestedIds = ng.choices
                .map((nc) => (typeof nc.id === "string" ? nc.id : null))
                .filter((ncId): ncId is string => ncId !== null);

              for (const enc of existingNested.filter(
                (e) => !incomingNestedIds.includes(e.id)
              )) {
                await prisma.nestedOptionChoice.delete({ where: { id: enc.id } });
              }
              for (const nc of ng.choices) {
                if (!nc.id) {
                  await prisma.nestedOptionChoice.create({
                    data: {
                      nestedGroupId:   ng.id,
                      label:           nc.label,
                      priceAdjustment: nc.priceAdjustment ?? 0,
                    },
                  });
                } else {
                  await prisma.nestedOptionChoice.update({
                    where: { id: nc.id },
                    data:  {
                      label:           nc.label,
                      priceAdjustment: nc.priceAdjustment ?? 0,
                    },
                  });
                }
              }
            } else {
              const newNg = await prisma.nestedOptionGroup.create({
                data: {
                  parentChoiceId: choice.id,
                  title:          ng.title,
                  minRequired:    ng.minRequired ?? 0,
                  maxAllowed:     ng.maxAllowed  ?? null,
                },
              });
              for (const nc of ng.choices) {
                await prisma.nestedOptionChoice.create({
                  data: {
                    nestedGroupId:   newNg.id,
                    label:           nc.label,
                    priceAdjustment: nc.priceAdjustment ?? 0,
                  },
                });
              }
            }
          } else if (dbChoice?.nestedOptionGroup) {
            await prisma.$transaction([
              prisma.nestedOptionChoice.deleteMany({
                where: { nestedGroupId: dbChoice.nestedOptionGroup.id },
              }),
              prisma.nestedOptionGroup.delete({ where: { id: dbChoice.nestedOptionGroup.id } }),
            ]);
          }
        }
      }
    }

    // 9. Finally, update the menuItem’s main fields
    const updatedItem = await prisma.menuItem.update({
      where: { id: itemId },
      data:  { ...updateData },
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

    // 10. Sync this single item to Clover (fire-and-forget)
    try {
      await syncOne(itemId);
    } catch (syncErr) {
      console.error("Error syncing to Clover after update:", syncErr);
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
/*  DELETE /api/menu/item/:itemId  — deletes locally + modifiers,    */
/*                                  modifier-groups, stock & item     */
/* ================================================================== */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await ctx.params;

  // 1) Read Clover IDs before deleting locally
  const local = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: {
      cloverItemId: true,
      category: { select: { cloverCategoryId: true } },
      optionGroups: { select: { cloverGroupId: true } },
    },
  });

  // 2) Delete everything locally
  await prisma.$transaction([
    prisma.nestedOptionChoice.deleteMany({
      where: {
        nestedGroup: {
          parentChoice: { optionGroup: { menuItemId: itemId } },
        },
      },
    }),
    prisma.nestedOptionGroup.deleteMany({
      where: {
        parentChoice: { optionGroup: { menuItemId: itemId } },
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

  // 3) Mirror delete in Clover (best-effort)
  try {
    if (local?.cloverItemId) {
      // 3.a Delete each modifier group (and its modifiers)
      for (const gid of local.optionGroups
        .map((g) => g.cloverGroupId)
        .filter((id): id is string => Boolean(id))
      ) {
        await cloverFetch(
          `/v3/merchants/${merchantId}/modifier_groups/${gid}`,
          { method: "DELETE" }
        );
      }

      // 3.b Unlink the item-category association
      const catId = local.category?.cloverCategoryId;
      if (catId) {
        await cloverFetch(
          `/v3/merchants/${merchantId}/category_items?delete=true`,
          {
            method: "POST",
            body: JSON.stringify({
              elements: [
                { item: { id: local.cloverItemId }, category: { id: catId } }
              ],
            }),
          }
        );
      }

      // 3.c Delete stock record (ignore 404)
      await cloverFetch(
        `/v3/merchants/${merchantId}/item_stocks/${local.cloverItemId}`,
        { method: "DELETE" }
      ).catch(() => {});

      // 3.d Delete the item itself
      await cloverFetch(
        `/v3/merchants/${merchantId}/items/${local.cloverItemId}`,
        { method: "DELETE" }
      );
    }
  } catch (err) {
    console.error("Clover cleanup error:", err);
  }

  return NextResponse.json(
    { message: "Menu item, its modifiers/groups, stock & category removed from Clover." },
    { status: 200 },
  );
}
