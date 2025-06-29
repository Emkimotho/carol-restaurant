// File: app/api/drivers/[id]/status/route.ts

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

type Params = { id: string };

// Disable caching on all responses
const noStoreHeaders = { 'Cache-Control': 'no-store' };

/**
 * GET /api/drivers/[id]/status
 * Returns { isOnline: boolean }.
 * Only the driver themselves or an admin may fetch this.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  // 1️⃣ Validate driver ID
  const driverId = Number(params.id);
  if (isNaN(driverId)) {
    return NextResponse.json(
      { error: 'Invalid driver ID' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  // 2️⃣ Authenticate via NextAuth JWT
  const token = (await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET!,
  })) as any;
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  // 3️⃣ Parse session user ID
  const rawSub = token.sub;
  const sessionUserId =
    typeof rawSub === 'string'
      ? parseInt(rawSub, 10)
      : typeof rawSub === 'number'
      ? rawSub
      : NaN;
  if (!sessionUserId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  // 4️⃣ Check roles for authorization
  const rolesRaw = token.roles;
  const roles: string[] = [];
  if (Array.isArray(rolesRaw)) {
    for (const r of rolesRaw) {
      if (typeof r === 'string') roles.push(r.toLowerCase());
    }
  } else if (typeof rolesRaw === 'string') {
    roles.push(rolesRaw.toLowerCase());
  }
  const isAdmin = roles.includes('admin') || roles.includes('superadmin');

  if (sessionUserId !== driverId && !isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: noStoreHeaders }
    );
  }

  // 5️⃣ Fetch driver status
  const user = await prisma.user.findUnique({
    where: { id: driverId },
    select: { isOnline: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: 'Driver not found' },
      { status: 404, headers: noStoreHeaders }
    );
  }

  // 6️⃣ Return the status
  return NextResponse.json(
    { isOnline: user.isOnline },
    { headers: noStoreHeaders }
  );
}

/**
 * PATCH /api/drivers/[id]/status
 * Body: { status: 'online' | 'offline' }
 * Only the driver themselves or an admin may update.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  // 1️⃣ Validate driver ID
  const driverId = Number(params.id);
  if (isNaN(driverId)) {
    return NextResponse.json(
      { error: 'Invalid driver ID' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  // 2️⃣ Authenticate via NextAuth JWT
  const token = (await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET!,
  })) as any;
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  // 3️⃣ Parse session user ID
  const rawSub = token.sub;
  const sessionUserId =
    typeof rawSub === 'string'
      ? parseInt(rawSub, 10)
      : typeof rawSub === 'number'
      ? rawSub
      : NaN;
  if (!sessionUserId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  // 4️⃣ Check roles for authorization
  const rolesRaw = token.roles;
  const roles: string[] = [];
  if (Array.isArray(rolesRaw)) {
    for (const r of rolesRaw) {
      if (typeof r === 'string') roles.push(r.toLowerCase());
    }
  } else if (typeof rolesRaw === 'string') {
    roles.push(rolesRaw.toLowerCase());
  }
  const isAdmin = roles.includes('admin') || roles.includes('superadmin');

  if (sessionUserId !== driverId && !isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: noStoreHeaders }
    );
  }

  // 5️⃣ Parse and validate request body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400, headers: noStoreHeaders }
    );
  }
  if (body.status !== 'online' && body.status !== 'offline') {
    return NextResponse.json(
      { error: "Payload must be { status: 'online'|'offline' }" },
      { status: 422, headers: noStoreHeaders }
    );
  }

  // 6️⃣ Update driver status
  try {
    const updated = await prisma.user.update({
      where: { id: driverId },
      data: { isOnline: body.status === 'online' },
      select: { isOnline: true },
    });
    return NextResponse.json(
      { isOnline: updated.isOnline },
      { headers: noStoreHeaders }
    );
  } catch (err) {
    console.error('Failed to update driver status:', err);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
