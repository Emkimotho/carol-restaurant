// File: app/api/customer/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(request: Request) {
  // 1) Only allow signed-in users
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Parse the updatable fields
  const {
    phone,
    streetAddress,
    aptSuite,
    city,
    state,
    zip,
    country,
  } = await request.json();

  // 3) Update the user record
  try {
    const updated = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        phone,
        streetAddress,
        aptSuite,
        city,
        state,
        zip,
        country,
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        streetAddress: true,
        aptSuite: true,
        city: true,
        state: true,
        zip: true,
        country: true,
      },
    });

    // 4) Return the new profile
    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error("Profile update failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
