// File: app/api/users/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/users?roles=STAFF,DRIVER
 *
 * • If ?roles=… is given, returns users matching at least one of those roles,
 *   but always excludes any ADMIN users.
 * • If no ?roles=… is given, returns all non-ADMIN users.
 */
export async function GET(req: Request) {
  try {
    const url        = new URL(req.url);
    const rolesParam = url.searchParams.get("roles") ?? "";

    // Exclude any ADMIN users
    const excludeAdmin = {
      roles: { none: { role: { name: RoleName.ADMIN } } }
    };

    let whereClause;
    if (rolesParam.trim()) {
      const wanted = rolesParam
        .split(",")
        .map(r => r.trim().toUpperCase())
        .filter(r => !!r) as RoleName[];

      whereClause = {
        AND: [
          excludeAdmin,
          { roles: { some: { role: { name: { in: wanted } } } } }
        ]
      };
    } else {
      whereClause = excludeAdmin;
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        roles: {
          select: { role: { select: { name: true } } }
        },
        staffProfile: {
          select: {
            photoPublicId: true,
            photoUrl:      true,
            position:      true
          }
        },
        driverProfile: {
          select: {
            photoPublicId:  true,
            photoUrl:       true,
            licenseNumber:  true,
            carMakeModel:   true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ users });
  } catch (err) {
    console.error("GET /api/users error:", err);
    return NextResponse.json(
      { message: "Internal error" },
      { status: 500 }
    );
  }
}
