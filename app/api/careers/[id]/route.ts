// app/api/careers/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const career = await prisma.career.findUnique({
      where: { id },
      include: { applications: true },
    });
    if (!career) {
      return NextResponse.json({ message: "Career not found" }, { status: 404 });
    }
    return NextResponse.json({ career });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, description, requirements, deadline } = body;
  try {
    const updatedCareer = await prisma.career.update({
      where: { id },
      data: {
        title,
        description,
        requirements,
        deadline: new Date(deadline),
      },
    });
    return NextResponse.json({ career: updatedCareer });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const deletedCareer = await prisma.career.delete({
      where: { id },
    });
    return NextResponse.json({ career: deletedCareer });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
