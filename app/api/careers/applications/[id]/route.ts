// app/api/careers/applications/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  try {
    const deletedApplication = await prisma.application.delete({
      where: { id },
    });
    return NextResponse.json({ application: deletedApplication });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
