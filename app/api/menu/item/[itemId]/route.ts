import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/menu/item/[itemId]
 * Fetch a single menu item with its category and nested option groups.
 */
export async function GET(
  request: Request,
  context: { params: { itemId: string } }
) {
  try {
    const { itemId } = context.params;
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: itemId },
      include: {
        category: true, // Include the category so that its id is available on the client
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
    return NextResponse.json({ item: menuItem }, { status: 200 });
  } catch (error) {
    console.error("Error fetching menu item:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/menu/item/[itemId]
 * Update an existing menu item along with its nested option groups.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;
    const payload = await request.json();

    // Destructure payload:
    // - optionGroups: nested option groups data.
    // - categoryId: the ID for the category (for relational update)
    // - menuItemData: remaining top-level fields.
    const { optionGroups, categoryId, ...menuItemData } = payload;

    // STEP 1: Remove all existing nested records for a clean update.
    const existingOptionGroups = await prisma.menuItemOptionGroup.findMany({
      where: { menuItemId: itemId },
      select: { id: true },
    });
    const optionGroupIds = existingOptionGroups.map((group) => group.id);

    if (optionGroupIds.length) {
      // a. Delete nested option choices for choices with nested option groups.
      const optionChoicesWithNested = await prisma.menuOptionChoice.findMany({
        where: {
          optionGroup: { menuItemId: itemId },
          nestedOptionGroup: { isNot: null },
        },
        select: {
          nestedOptionGroup: { select: { id: true } },
        },
      });
      const nestedGroupIds = optionChoicesWithNested
        .map((choice) => choice.nestedOptionGroup?.id)
        .filter((id): id is string => Boolean(id));
      if (nestedGroupIds.length > 0) {
        await prisma.nestedOptionChoice.deleteMany({
          where: { nestedGroupId: { in: nestedGroupIds } },
        });
      }

      // b. Delete nested option groups for this menu item.
      await prisma.nestedOptionGroup.deleteMany({
        where: { parentChoice: { optionGroup: { menuItemId: itemId } } },
      });

      // c. Delete menu option choices for this menu item.
      await prisma.menuOptionChoice.deleteMany({
        where: { optionGroupId: { in: optionGroupIds } },
      });
    }

    // d. Delete the menu item’s option groups.
    await prisma.menuItemOptionGroup.deleteMany({
      where: { menuItemId: itemId },
    });

    // STEP 2: Build nested create input for new option groups.
    const optionGroupsNested = {
      create: optionGroups.map((group: any) => ({
        title: group.title,
        minRequired: group.minRequired,
        maxAllowed: group.maxAllowed,
        optionType: group.optionType,
        choices: {
          create: group.choices.map((choice: any) => ({
            label: choice.label,
            priceAdjustment: choice.priceAdjustment,
            nestedOptionGroup: choice.nestedOptionGroup
              ? {
                  create: {
                    title: choice.nestedOptionGroup.title,
                    minRequired: choice.nestedOptionGroup.minRequired,
                    maxAllowed: choice.nestedOptionGroup.maxAllowed,
                    choices: {
                      create: (choice.nestedOptionGroup.choices || []).map(
                        (nChoice: any) => ({
                          label: nChoice.label,
                          priceAdjustment: nChoice.priceAdjustment,
                        })
                      ),
                    },
                  },
                }
              : undefined,
          })),
        },
      })),
    };

    // STEP 3: Update the menu item.
    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...menuItemData,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        optionGroups: optionGroupsNested,
      },
    });

    return NextResponse.json({ item: updated }, { status: 200 });
  } catch (error) {
    console.error("Error updating menu item:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/menu/item/[itemId]
 * Delete a menu item and all its dependents.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await context.params;

    // 1. Delete NestedOptionChoices from all NestedOptionGroups of MenuOptionChoices associated with this item.
    const optionChoices = await prisma.menuOptionChoice.findMany({
      where: {
        optionGroup: { menuItemId: itemId },
        nestedOptionGroup: { isNot: null },
      },
      select: { nestedOptionGroup: { select: { id: true } } },
    });
    const nestedGroupIds = optionChoices
      .map((choice) => choice.nestedOptionGroup?.id)
      .filter((id): id is string => Boolean(id));
    if (nestedGroupIds.length > 0) {
      await prisma.nestedOptionChoice.deleteMany({
        where: { nestedGroupId: { in: nestedGroupIds } },
      });
    }

    // 2. Delete NestedOptionGroups for MenuOptionChoices of this item.
    await prisma.nestedOptionGroup.deleteMany({
      where: { parentChoice: { optionGroup: { menuItemId: itemId } } },
    });

    // 3. Delete MenuOptionChoices for this item.
    await prisma.menuOptionChoice.deleteMany({
      where: { optionGroup: { menuItemId: itemId } },
    });

    // 4. Delete MenuItemOptionGroups for this item.
    await prisma.menuItemOptionGroup.deleteMany({
      where: { menuItemId: itemId },
    });

    // 5. Finally, delete the MenuItem.
    await prisma.menuItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ message: "Menu item deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
