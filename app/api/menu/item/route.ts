/* ------------------------------------------------------------------ */
/*  File: app/api/menu/item/route.ts                                  */
/* ------------------------------------------------------------------ */
/*  • GET  /api/menu/item        → list items w/ nesting               */
/*  • POST /api/menu/item        → create item (cloverItemId optional) */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";

/* ================================================================== */
/*  GET  /api/menu/item                                               */
/* ================================================================== */
export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
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
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ menuItems: items }, { status: 200 });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/* ================================================================== */
/*  POST /api/menu/item                                               */
/* ================================================================== */
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      title,
      description,
      price,
      image,
      hasSpiceLevel,
      showInGolfMenu,
      categoryId,
      optionGroups,
      cloverItemId,
      stock,
    } = data;

    /* -------- basic validation ------------------------------------ */
    if (!title || typeof title !== "string") {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }
    if (price == null || typeof price !== "number") {
      return NextResponse.json({ message: "Price must be a number" }, { status: 400 });
    }
    if (!categoryId || typeof categoryId !== "string") {
      return NextResponse.json({ message: "categoryId is required" }, { status: 400 });
    }
    if (cloverItemId !== undefined && typeof cloverItemId !== "string") {
      return NextResponse.json(
        { message: "cloverItemId, if provided, must be a string" },
        { status: 400 }
      );
    }

    /* -------- transform optionGroups → create payload ------------- */
    const buildOptionGroupsCreate = (groups: any[]) =>
      Array.isArray(groups)
        ? {
            create: groups.map((group: any) => ({
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

    const optionGroupsCreate = buildOptionGroupsCreate(optionGroups);

    /* -------- create item ----------------------------------------- */
    const item = await prisma.menuItem.create({
      data: {
        title,
        description,
        price,
        image,
        hasSpiceLevel:  Boolean(hasSpiceLevel),
        showInGolfMenu: Boolean(showInGolfMenu),
        categoryId,
        cloverItemId: cloverItemId ?? null, // now optional
        stock: stock ?? 0,
        optionGroups: optionGroupsCreate,
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

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
