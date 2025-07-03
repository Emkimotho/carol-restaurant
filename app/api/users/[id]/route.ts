// File: app/api/users/[id]/route.ts

import { NextResponse }                     from "next/server";
import prisma                               from "@/lib/prisma";
import { Prisma, RoleName }                 from "@prisma/client";

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
  console.log("GET /api/users/:id", { id, userId });

  if (!Number.isInteger(userId)) {
    console.warn("GET invalid userId", id);
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
        roles: {
          select: { role: { select: { name: true } } }
        },
        staffProfile: {
          select: {
            position: true,
            photoUrl: true,
            photoPublicId: true
          }
        },
        driverProfile: {
          select: {
            licenseNumber: true,
            carMakeModel: true,
            photoUrl: true,
            photoPublicId: true
          }
        }
      }
    });

    if (!u) {
      console.warn("GET user not found", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const payload = {
      id:            u.id,
      firstName:     u.firstName,
      lastName:      u.lastName,
      email:         u.email,
      phone:         u.phone,
      status:        u.status,
      roles:         u.roles.map(r => r.role.name as RoleName),
      position:      u.staffProfile?.position ?? null,
      photoPublicId: u.staffProfile?.photoPublicId ?? u.driverProfile?.photoPublicId ?? null,
      photoUrl:      u.staffProfile?.photoUrl     ?? u.driverProfile?.photoUrl     ?? null,
      licenseNumber: u.driverProfile?.licenseNumber ?? null,
      carMakeModel:  u.driverProfile?.carMakeModel  ?? null,
    };

    console.log("GET response payload", payload);
    return NextResponse.json(payload);

  } catch (err) {
    console.error("GET /api/users/:id error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/users/:id
 * — Updates name/phone
 * — Replaces roles
 * — Conditionally upserts staffProfile (if STAFF)
 * — Conditionally upserts driverProfile (if DRIVER)
 */
export async function PUT(
  req: Request,
  { params }: Context
) {
  const { id } = await params;
  const userId = Number(id);
  console.log("PUT /api/users/:id", { id, userId });

  if (!Number.isInteger(userId)) {
    console.warn("PUT invalid userId", id);
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let bodyRaw: any;
  try {
    bodyRaw = await req.json();
  } catch (e) {
    console.error("PUT JSON parse failed", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  console.log("PUT bodyRaw", bodyRaw);

  const {
    firstName,
    lastName,
    phone,
    roles: newRoles,
    position,
    licenseNumber,
    carMakeModel,
    photoUrl
  } = bodyRaw as Record<string, unknown>;

  const data: Prisma.UserUpdateInput = {};

  // --- Name & Phone ---
  if (firstName !== undefined) {
    if (typeof firstName !== "string") {
      console.warn("PUT bad firstName", firstName);
      return NextResponse.json({ error: "Invalid firstName" }, { status: 400 });
    }
    data.firstName = firstName.trim();
  }
  if (lastName !== undefined) {
    if (typeof lastName !== "string") {
      console.warn("PUT bad lastName", lastName);
      return NextResponse.json({ error: "Invalid lastName" }, { status: 400 });
    }
    data.lastName = lastName.trim();
  }
  if (phone !== undefined) {
    if (typeof phone !== "string") {
      console.warn("PUT bad phone", phone);
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    data.phone = phone.trim() || null;
  }

  // --- Roles ---
  let rolesArray: RoleName[] = [];
  if (newRoles !== undefined) {
    if (!Array.isArray(newRoles) || newRoles.some(r => typeof r !== "string")) {
      console.warn("PUT bad roles format", newRoles);
      return NextResponse.json({ error: "`roles` must be string[]" }, { status: 400 });
    }
    const upper = (newRoles as string[]).map(r => r.toUpperCase());
    const valid = upper.filter((r): r is RoleName =>
      (Object.values(RoleName) as string[]).includes(r)
    );
    if (valid.length !== upper.length) {
      console.warn("PUT invalid roles", newRoles);
      return NextResponse.json({ error: "One or more roles invalid" }, { status: 400 });
    }
    rolesArray = valid;
    data.roles = {
      deleteMany: {},
      create: valid.map(name => ({ role: { connect: { name } } })),
    };
  }

  // --- StaffProfile (only if STAFF) ---
  if (rolesArray.includes(RoleName.STAFF)) {
    if (position !== undefined && typeof position !== "string") {
      console.warn("PUT bad position", position);
      return NextResponse.json({ error: "Invalid position" }, { status: 400 });
    }
    if (photoUrl !== undefined && typeof photoUrl !== "string") {
      console.warn("PUT bad photoUrl", photoUrl);
      return NextResponse.json({ error: "Invalid photoUrl" }, { status: 400 });
    }
    data.staffProfile = {
      upsert: {
        create: {
          position: position as string ?? "",
          photoUrl:  photoUrl as string  ?? "",
        },
        update: {
          ...(position !== undefined && { position: (position as string).trim() }),
          ...(photoUrl  !== undefined && { photoUrl:  photoUrl as string }),
        }
      }
    };
  }

  // --- DriverProfile (only if DRIVER) ---
  if (rolesArray.includes(RoleName.DRIVER)) {
    if (typeof licenseNumber !== "string" || typeof carMakeModel !== "string") {
      console.warn("PUT missing/invalid driver fields", { licenseNumber, carMakeModel });
      return NextResponse.json({ error: "Driver role requires licenseNumber & carMakeModel" }, { status: 400 });
    }
    if (photoUrl !== undefined && typeof photoUrl !== "string") {
      console.warn("PUT bad driver photoUrl", photoUrl);
      return NextResponse.json({ error: "Invalid driver photoUrl" }, { status: 400 });
    }
    data.driverProfile = {
      upsert: {
        create: {
          licenseNumber: licenseNumber.trim(),
          carMakeModel:  carMakeModel.trim(),
          photoUrl:      (photoUrl as string) ?? "",
        },
        update: {
          licenseNumber: licenseNumber.trim(),
          carMakeModel:  carMakeModel.trim(),
          ...(photoUrl !== undefined && { photoUrl: photoUrl as string }),
        }
      }
    };
  }

  if (Object.keys(data).length === 0) {
    console.log("PUT nothing to update");
    return NextResponse.json({ message: "No changes provided" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data
    });
    console.log("PUT succeeded for user", userId);
    return NextResponse.json({ message: "User updated" });
  } catch (err: any) {
    console.error("PUT /api/users/:id error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/users/:id
 * (Toggle status)
 */
export async function PATCH(
  req: Request,
  { params }: Context
) {
  const { id } = await params;
  const userId = Number(id);
  console.log("PATCH /api/users/:id", { userId });

  if (!Number.isInteger(userId)) {
    console.warn("PATCH invalid userId", id);
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    console.error("PATCH parse JSON failed", e);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  console.log("PATCH body", body);

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
      console.warn("PATCH invalid action", action);
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: statusValue },
    });
    console.log("PATCH succeeded for user", userId, action);
    return NextResponse.json({ message: `User ${action}ed` });
  } catch (err: any) {
    console.error("PATCH /api/users/:id error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
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
  console.log("DELETE /api/users/:id", { userId });

  if (!Number.isInteger(userId)) {
    console.warn("DELETE invalid userId", id);
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  try {
    const deleted = await prisma.user.delete({ where: { id: userId } });
    console.log("DELETE succeeded for user", userId);
    return NextResponse.json({ message: `User ${deleted.email} deleted` });
  } catch (err: any) {
    console.error("DELETE /api/users/:id error:", err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
