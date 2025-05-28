// File: app/api/careers/applications/route.ts

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      email?: string;
      jobTitle?: string;
      resumeUrl?: string;
    };

    const { firstName, lastName, email, jobTitle, resumeUrl } = payload;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !jobTitle ||
      !resumeUrl
    ) {
      return NextResponse.json(
        { error: "Missing one or more required fields" },
        { status: 400 }
      );
    }

    const application = await prisma.application.create({
      data: {
        applicantName: `${firstName} ${lastName}`,
        email,
        jobTitle,
        resumeUrl,
      },
    });

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error creating career application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
