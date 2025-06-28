// File: app/api/drivers/[id]/status/route.ts

export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

type Params = { id: string };

// Helper to set no-store headers
const noStoreHeaders = { 'Cache-Control': 'no-store' };

/**
 * GET /api/drivers/[id]/status
 * Returns { isOnline: boolean } for the given driver ID.
 * Only the driver themselves or an admin may fetch this.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Await the dynamic params (Next.js15+)
  const { id: rawId } = await params;
  const driverId = Number(rawId);
  if (isNaN(driverId)) {
    return NextResponse.json(
      { error: 'Invalid driver ID' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  // Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }
  const sessId = (session.user as any).id;
  const sessionUserId =
    typeof sessId === 'string'
      ? parseInt(sessId, 10)
      : typeof sessId === 'number'
      ? sessId
      : null;
  if (sessionUserId === null) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }

  // Authorization: self or admin
  const rolesRaw = (session.user as any).roles;
  const roles: string[] = Array.isArray(rolesRaw)
    ? rolesRaw.map((r) => r.toString().toLowerCase())
    : [];
  const isAdmin = roles.includes('admin') || roles.includes('superadmin');
  if (sessionUserId !== driverId && !isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: noStoreHeaders }
    );
  }

  // Fetch from DB
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

  return NextResponse.json(
    { isOnline: user.isOnline },
    { headers: noStoreHeaders }
  );
}

/**
 * PATCH /api/drivers/[id]/status
 * Body: { status: 'online' | 'offline' }
 * Updates the user.isOnline flag for the driver.
 * Only the driver themself or an admin may update.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Await the dynamic params
  const { id: rawId } = await params;
  const driverId = Number(rawId);
  if (isNaN(driverId)) {
    return NextResponse.json(
      { error: 'Invalid driver ID' },
      { status: 400, headers: noStoreHeaders }
    );
  }

  // Authenticate
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }
  const sessId = (session.user as any).id;
  const sessionUserId =
    typeof sessId === 'string'
      ? parseInt(sessId, 10)
      : typeof sessId === 'number'
      ? sessId
      : null;
  if (sessionUserId === null) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noStoreHeaders }
    );
  }
  const rolesRaw = (session.user as any).roles;
  const roles: string[] = Array.isArray(rolesRaw)
    ? rolesRaw.map((r) => r.toString().toLowerCase())
    : [];
  const isAdmin = roles.includes('admin') || roles.includes('superadmin');
  if (sessionUserId !== driverId && !isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403, headers: noStoreHeaders }
    );
  }

  // Parse body
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

  // Update DB
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
