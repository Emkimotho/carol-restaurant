/* ------------------------------------------------------------------ */
/*  File: app/api/menu/item/[itemId]/route.ts                         */
/* ------------------------------------------------------------------ */
/*  • GET    /api/menu/item/:itemId                                   */
/*  • PUT    /api/menu/item/:itemId                                   */
/*  • DELETE /api/menu/item/:itemId                                   */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";

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
  try {
    const body = await req.json();

    /* -------- scalar field patch ---------------------------------- */
    const updateData: Record<string, any> = {};
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

    /* -------- build optionGroups create --------------------------- */
    const buildOptionGroupsCreate = (optionGroups: any[]) =>
      Array.isArray(optionGroups)
        ? {
            create: optionGroups.map((group: any) => ({
              title:       group.title,
              minRequired: group.minRequired,
              maxAllowed:  group.maxAllowed,
              optionType:  group.optionType,
              choices: Array.isArray(group.choices)
                ? {
                    create: group.choices.map((choice: any) => ({
                      label:           choice.label,
                      priceAdjustment: choice.priceAdjustment,
                      nestedOptionGroup: choice.nestedOptionGroup
                        ? {
                            create: {
                              title:       choice.nestedOptionGroup.title,
                              minRequired: choice.nestedOptionGroup.minRequired,
                              maxAllowed:  choice.nestedOptionGroup.maxAllowed,
                              choices: Array.isArray(choice.nestedOptionGroup.choices)
                                ? {
                                    create: choice.nestedOptionGroup.choices.map(
                                      (nc: any) => ({
                                        label:           nc.label,
                                        priceAdjustment: nc.priceAdjustment,
                                      }),
                                    ),
                                  }
                                : undefined,
                            },
                          }
                        : undefined,
                    })),
                  }
                : undefined,
            })),
          }
        : undefined;

    const optionGroupsCreate = buildOptionGroupsCreate(body.optionGroups);

    /* -------- transaction: wipe + recreate groups ----------------- */
    const updated = await prisma.$transaction(async (tx) => {
      if (optionGroupsCreate) {
        await tx.nestedOptionChoice.deleteMany({
          where: {
            nestedGroup: {
              parentChoice: {
                optionGroup: { menuItemId: itemId },
              },
            },
          },
        });
        await tx.nestedOptionGroup.deleteMany({
          where: {
            parentChoice: {
              optionGroup: { menuItemId: itemId },
            },
          },
        });
        await tx.menuOptionChoice.deleteMany({
          where: { optionGroup: { menuItemId: itemId } },
        });
        await tx.menuItemOptionGroup.deleteMany({
          where: { menuItemId: itemId },
        });
      }

      return tx.menuItem.update({
        where: { id: itemId },
        data:  {
          ...updateData,
          ...(optionGroupsCreate ? { optionGroups: optionGroupsCreate } : {}),
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
    });

    return NextResponse.json({ menuItem: updated }, { status: 200 });
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
