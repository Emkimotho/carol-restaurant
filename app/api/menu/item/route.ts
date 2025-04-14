import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/menu/item
 * Returns { menuItems: [...] } with nested option groups and category data.
 */
export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      include: {
        category: true, // <-- Ensure the category relation is included
        optionGroups: {
          include: {
            choices: {
              include: {
                nestedOptionGroup: {
                  include: { choices: true },
                },
              },
            },
          },
        },
      },
    });
    return NextResponse.json({ menuItems: items }, { status: 200 });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/menu/item
 * Creates a new menu item.
 */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      title,
      description,
      price,
      image,
      hasSpiceLevel,
      categoryId,
      showInGolfMenu,
      optionGroups,
    } = data;

    const optionGroupsCreate = optionGroups
      ? {
          create: optionGroups.map((group: any) => ({
            title: group.title,
            minRequired: group.minRequired,
            maxAllowed: group.maxAllowed,
            optionType: group.optionType,
            choices: group.choices
              ? {
                  create: group.choices.map((choice: any) => ({
                    label: choice.label,
                    priceAdjustment: choice.priceAdjustment,
                    nestedOptionGroup: choice.nestedOptionGroup
                      ? {
                          create: {
                            title: choice.nestedOptionGroup.title,
                            minRequired: choice.nestedOptionGroup.minRequired,
                            maxAllowed: choice.nestedOptionGroup.maxAllowed,
                            choices: choice.nestedOptionGroup.choices
                              ? {
                                  create: choice.nestedOptionGroup.choices.map(
                                    (nc: any) => ({
                                      label: nc.label,
                                      priceAdjustment: nc.priceAdjustment,
                                    })
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

    const item = await prisma.menuItem.create({
      data: {
        title,
        description,
        price,
        image,
        hasSpiceLevel,
        categoryId,
        showInGolfMenu,
        optionGroups: optionGroupsCreate,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
