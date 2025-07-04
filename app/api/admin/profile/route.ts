// File: app/api/admin/profile/route.ts
// -----------------------------------------------------
//  GET  → fetch the signed-in admin’s profile by ID
//  PATCH → update the signed-in admin’s contact, address, & position by ID
// -----------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }         from "next-auth/next";
import { authOptions }              from "@/lib/auth";
import prisma                       from "@/lib/prisma";

/** Pulls roles out of the session, whether they come as an array or a single string */
function extractRoles(session: any): string[] {
  if (Array.isArray(session.user.roles)) {
    return session.user.roles.map((r: string) => r.toLowerCase());
  }
  if (typeof session.user.role === "string") {
    return [session.user.role.toLowerCase()];
  }
  return [];
}

/** Returns true if the session’s user has the "admin" role (case-insensitive) */
function isAdmin(session: any): boolean {
  return extractRoles(session).includes("admin");
}

export async function GET(req: NextRequest) {
  // 1️⃣ Authenticate & authorize
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // 2️⃣ Fetch profile
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName:     true,
        lastName:      true,
        email:         true,
        phone:         true,
        streetAddress: true,
        aptSuite:      true,
        city:          true,
        state:         true,
        zip:           true,
        country:       true,
        staffProfile:  { select: { position: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: user });
  } catch (err) {
    console.error("GET /api/admin/profile error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // 1️⃣ Authenticate & authorize
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isAdmin(session)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // 2️⃣ Parse update fields
  const {
    phone,
    streetAddress,
    aptSuite,
    city,
    state,
    zip,
    country,
    position,
  } = await req.json();

  // 3️⃣ Perform update with upsert on staffProfile
  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone,
        streetAddress,
        aptSuite,
        city,
        state,
        zip,
        country,
        staffProfile: {
          upsert: {
            create: { photoUrl: "", position },
            update: { position },
          },
        },
      },
      select: {
        firstName:     true,
        lastName:      true,
        email:         true,
        phone:         true,
        streetAddress: true,
        aptSuite:      true,
        city:          true,
        state:         true,
        zip:           true,
        country:       true,
        staffProfile:  { select: { position: true } },
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error("PATCH /api/admin/profile error:", err);
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}
