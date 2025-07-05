/* ======================================================================== */
/*  /api/drivers/[id]/status                                                */
/*  • GET   → { isOnline }                                                  */
/*  • PATCH → { isOnline }                                                  */
/*    (body: { status: 'online' | 'offline' })                              */
/*  Access: driver themselves or ADMIN / SUPERADMIN                         */
/* ======================================================================== */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getToken }                  from 'next-auth/jwt';
import prisma                        from '@/lib/prisma';

/* Disable all caches for this route */
const noStore = { headers: { 'Cache-Control': 'no-store' } };

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
async function getDriverId(rawParams: { id?: string } | Promise<{ id?: string }>) {
  /* ❗ Next 14+ marks `params` as a Promise – must be awaited */
  const { id } = await rawParams;
  const n = Number(id);
  if (Number.isNaN(n)) throw new Error('Invalid driver ID');
  return n;
}

async function getSessionUserId(req: NextRequest) {
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  })) as any;

  if (!token) throw new Error('Unauthorized');

  const sub = token.sub;
  const id  =
    typeof sub === 'string' ? parseInt(sub, 10) :
    typeof sub === 'number' ? sub : NaN;

  if (!id) throw new Error('Unauthorized');
  return { id, roles: Array.isArray(token.roles) ? token.roles : [token.roles] };
}

function forbidden(resMsg = 'Forbidden') {
  return NextResponse.json({ error: resMsg }, { status: 403, ...noStore });
}

/* ------------------------------------------------------------------ */
/*  GET                                                               */
/* ------------------------------------------------------------------ */
export async function GET(
  req: NextRequest,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    const driverId           = await getDriverId(ctx.params);
    const { id: uid, roles } = await getSessionUserId(req);

    const isAdmin = (roles ?? []).some((r: string) =>
      ['admin', 'superadmin'].includes(String(r).toLowerCase())
    );
    if (uid !== driverId && !isAdmin) return forbidden();

    const driver = await prisma.user.findUnique({
      where:  { id: driverId },
      select: { isOnline: true },
    });
    if (!driver)
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404, ...noStore }
      );

    return NextResponse.json({ isOnline: driver.isOnline }, noStore);
  } catch (err: any) {
    const msg = err.message || 'Bad Request';
    const code = /Unauthorized|Forbidden|Invalid/.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status: code, ...noStore });
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH                                                             */
/* ------------------------------------------------------------------ */
export async function PATCH(
  req: NextRequest,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    const driverId           = await getDriverId(ctx.params);
    const { id: uid, roles } = await getSessionUserId(req);

    const isAdmin = (roles ?? []).some((r: string) =>
      ['admin', 'superadmin'].includes(String(r).toLowerCase())
    );
    if (uid !== driverId && !isAdmin) return forbidden();

    const body = await req.json().catch(() => null);
    if (!body || !['online', 'offline'].includes(body.status))
      return NextResponse.json(
        { error: "Body must be { status: 'online' | 'offline' }" },
        { status: 422, ...noStore }
      );

    const updated = await prisma.user.update({
      where: { id: driverId },
      data : { isOnline: body.status === 'online' },
      select: { isOnline: true },
    });

    return NextResponse.json({ isOnline: updated.isOnline }, noStore);
  } catch (err: any) {
    const msg  = err.message || 'Server error';
    const code = /Unauthorized|Forbidden|Invalid/.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status: code, ...noStore });
  }
}
