// File: app/api/registeruser/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Next.js 15+: params is async
type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  // 1) await and validate id
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (isNaN(id)) {
    return NextResponse.json(
      { message: "Invalid user ID" },
      { status: 400 }
    );
  }

  try {
    // 2) single delete call — DB cascades will clean up profiles & roles
    const deleted = await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: `User ${deleted.email} (ID ${id}) deleted` },
      { status: 200 }
    );

  } catch (err: any) {
    // 3) not found?
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { message: `No user found with ID ${id}` },
        { status: 404 }
      );
    }
    // 4) anything else
    console.error("DELETE /api/registeruser/[id] error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
