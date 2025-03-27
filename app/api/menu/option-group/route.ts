// File: app/api/menu/option-group/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { menuItemId, title, minRequired, maxAllowed, optionType, choices } = await request.json();

    if (!menuItemId || !title) {
      return NextResponse.json({ message: "menuItemId and title are required" }, { status: 400 });
    }

    const optionGroup = await prisma.menuItemOptionGroup.create({
      data: {
        menuItem: { connect: { id: menuItemId } },
        title,
        minRequired,
        maxAllowed,
        optionType,
        choices: {
          create: choices, // choices should match the structure for MenuOptionChoice
        },
      },
    });

    return NextResponse.json({ optionGroup }, { status: 201 });
  } catch (error) {
    console.error("Error creating option group:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
