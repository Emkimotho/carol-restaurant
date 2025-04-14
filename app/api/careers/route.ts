// app/api/careers/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const careers = await prisma.career.findMany({
      orderBy: { createdAt: "desc" },
      include: { applications: true },
    });
    return NextResponse.json({ careers });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, requirements, deadline } = body;
    const newCareer = await prisma.career.create({
      data: {
        title,
        description,
        // Store requirements as a comma-separated string
        requirements,
        deadline: new Date(deadline),
      },
    });
    return NextResponse.json({ career: newCareer });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
