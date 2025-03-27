// File: app/api/menu/item/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      include: {
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
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Destructure fields from the payload
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

    // Transform the optionGroups array into a nested create object for Prisma.
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
                    // If the choice includes a nested option group, transform it similarly:
                    nestedOptionGroup: choice.nestedOptionGroup
                      ? {
                          create: {
                            title: choice.nestedOptionGroup.title,
                            minRequired: choice.nestedOptionGroup.minRequired,
                            maxAllowed: choice.nestedOptionGroup.maxAllowed,
                            choices: choice.nestedOptionGroup.choices
                              ? {
                                  create: choice.nestedOptionGroup.choices.map((nc: any) => ({
                                    label: nc.label,
                                    priceAdjustment: nc.priceAdjustment,
                                  })),
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
