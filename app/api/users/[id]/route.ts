// File: app/api/users/[id]/route.ts
import { NextResponse }               from "next/server";
import prisma                         from "@/lib/prisma";
import { Prisma, RoleName }           from "@prisma/client";

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/:id
 */
export async function GET(
  _req: Request,
  { params }: Context
) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        roles: { select: { role: { select: { name: true } } } },
        staffProfile: { select: { position: true, photoUrl: true } },
        driverProfile: {
          select: {
            licenseNumber: true,
            carMakeModel: true,
            photoUrl: true,
          },
        },
      },
    });
    if (!u) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      id:            u.id,
      firstName:     u.firstName,
      lastName:      u.lastName,
      email:         u.email,
      phone:         u.phone,
      status:        u.status,
      roles:         u.roles.map(r => r.role.name),
      position:      u.staffProfile?.position ?? null,
      photoUrl:      u.staffProfile?.photoUrl ?? u.driverProfile?.photoUrl ?? null,
      licenseNumber: u.driverProfile?.licenseNumber ?? null,
      carMakeModel:  u.driverProfile?.carMakeModel ?? null,
    });
  } catch (err) {
    console.error("GET /api/users/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/users/:id
 *   Update name/phone, staff position, roles, and driver profile.
 */
export async function PUT(
  req: Request,
  { params }: Context
) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    firstName,
    lastName,
    phone,
    position,
    roles: newRoles,
    licenseNumber,
    carMakeModel,
  } = body as {
    firstName?: unknown;
    lastName?: unknown;
    phone?: unknown;
    position?: unknown;
    roles?: unknown;
    licenseNumber?: unknown;
    carMakeModel?: unknown;
  };

  const updateData: Prisma.UserUpdateInput = {};

  // Name & Phone
  if (
    firstName !== undefined ||
    lastName  !== undefined ||
    phone     !== undefined
  ) {
    if (
      (firstName !== undefined && typeof firstName !== "string") ||
      (lastName  !== undefined && typeof lastName  !== "string")
    ) {
      return NextResponse.json({ error: "Invalid name fields" }, { status: 400 });
    }
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName  !== undefined) updateData.lastName  = lastName;
    if (phone     !== undefined) updateData.phone     = phone as string;
  }

  // Staff Position
  if (position !== undefined) {
    if (typeof position !== "string") {
      return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    }
    updateData.staffProfile = {
      upsert: {
        create: { position, photoUrl: "" },
        update: { position },
      },
    };
  }

  // Roles
  if (newRoles !== undefined) {
    if (!Array.isArray(newRoles) || newRoles.some(r => typeof r !== "string")) {
      return NextResponse.json({ error: "`roles` must be string[]" }, { status: 400 });
    }
    const upper = (newRoles as string[]).map(r => r.toUpperCase());
    const validRoles = upper.filter((r): r is RoleName =>
      (Object.values(RoleName) as string[]).includes(r)
    );
    if (validRoles.length !== upper.length) {
      return NextResponse.json({ error: "One or more roles invalid" }, { status: 400 });
    }
    updateData.roles = {
      deleteMany: {},
      create: validRoles.map(roleName => ({
        role: { connect: { name: roleName } },
      })),
    };
  }

  // Driver Profile
  if (licenseNumber !== undefined || carMakeModel !== undefined) {
    if (
      (licenseNumber !== undefined && typeof licenseNumber !== "string") ||
      (carMakeModel  !== undefined && typeof carMakeModel  !== "string")
    ) {
      return NextResponse.json({ error: "Invalid driver fields" }, { status: 400 });
    }
    updateData.driverProfile = {
      upsert: {
        create: {
          licenseNumber: String(licenseNumber ?? ""),
          carMakeModel:  String(carMakeModel  ?? ""),
          photoUrl:      "",
        },
        update: {
          ...(licenseNumber !== undefined && { licenseNumber }),
          ...(carMakeModel  !== undefined && { carMakeModel }),
        },
      },
    };
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ message: "No changes provided" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
    return NextResponse.json({ message: "User updated" });
  } catch (err: any) {
    console.error("PUT /api/users/[id] error:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/users/:id
 */
export async function PATCH(
  req: Request,
  { params }: Context
) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { action } = body as { action?: string };

  let statusValue: Prisma.UserUpdateInput["status"];
  switch (action) {
    case "suspend":
      statusValue = "SUSPENDED";
      break;
    case "unsuspend":
      statusValue = "ACTIVE";
      break;
    case "ban":
      statusValue = "BANNED";
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: statusValue },
    });
    return NextResponse.json({ message: `User ${action}ed` });
  } catch (err: any) {
    console.error("PATCH /api/users/[id] error:", err);
    if (err.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/users/:id
 */
export async function DELETE(
  _req: Request,
  { params }: Context
) {
  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    const deleted = await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json(
      { message: `User ${deleted.email} deleted` },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("DELETE /api/users/[id] error:", err);
    if (err.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
