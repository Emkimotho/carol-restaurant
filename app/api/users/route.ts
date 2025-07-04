/* ────────────────────────────────────────────────────────────────────────────
 * File: app/api/users/route.ts
 * ---------------------------------------------------------------------------
 * GET /api/users
 *   • Optional query-string:  ?roles=ADMIN,STAFF,DRIVER
 *     – Returns users that have **at least one** of the requested roles
 *       (case-insensitive, validated against the RoleName enum).
 *   • If the query-string is omitted or blank, returns *all* users.
 *   • Always returns each user with:
 *       – Their roles   (role.role.name → string[])
 *       – staffProfile  (photo + position)
 *       – driverProfile (photo + vehicle info)
 * -------------------------------------------------------------------------*/

import { NextResponse }             from 'next/server';
import { PrismaClient, RoleName }   from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    /* ── 1. Parse & normalise ?roles=… (if present) ─────────────────────── */
    const { searchParams } = new URL(req.url);
    const rawRoles         = (searchParams.get('roles') ?? '')
                               .split(',')
                               .map(r => r.trim().toUpperCase())
                               .filter(Boolean);

    const validRoles       = rawRoles.filter((r): r is RoleName =>
      (Object.values(RoleName) as string[]).includes(r)
    );

    /* ── 2. Build dynamic WHERE clause ──────────────────────────────────── */
    const whereClause = validRoles.length
      ? {
          roles: {
            some: { role: { name: { in: validRoles } } }
          }
        }
      : {};  // no filter → all users

    /* ── 3. Query ───────────────────────────────────────────────────────── */
    const users = await prisma.user.findMany({
      where:  whereClause,
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
      orderBy: { createdAt: 'desc' }
    });

    /* ── 4. Respond ─────────────────────────────────────────────────────── */
    return NextResponse.json({ users });

  } catch (err) {
    console.error('GET /api/users error:', err);
    return NextResponse.json(
      { message: 'Internal error' },
      { status: 500 }
    );
  }
}
