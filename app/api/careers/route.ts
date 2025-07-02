// File: app/api/careers/route.ts

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";

export async function GET() {
  try {
    const careers = await prisma.career.findMany({
      orderBy: { createdAt: "desc" },
      include: { applications: true },
    });
    return NextResponse.json({ careers }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching careers:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

interface CareerRequestBody {
  title?: string;
  description?: string;
  requirements?: string;
  deadline?: string;
}

export async function POST(request: Request) {
  let body: CareerRequestBody;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      { message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { title, description, requirements, deadline } = body;

  // Basic validation
  if (!title || !description || !requirements || !deadline) {
    return NextResponse.json(
      {
        message:
          "Missing required fields: title, description, requirements, and deadline are all required.",
      },
      { status: 400 }
    );
  }

  const parsedDeadline = new Date(deadline);
  if (isNaN(parsedDeadline.getTime())) {
    return NextResponse.json(
      { message: "Invalid deadline; must be a valid date string." },
      { status: 400 }
    );
  }

  try {
    const newCareer = await prisma.career.create({
      data: {
        title,
        description,
        // Store requirements as a comma-separated string
        requirements,
        deadline: parsedDeadline,
      },
    });
    return NextResponse.json({ career: newCareer }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating career:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
