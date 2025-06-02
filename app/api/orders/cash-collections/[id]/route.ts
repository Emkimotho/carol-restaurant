/* =======================================================================
 * File: app/api/orders/cash-collections/[id]/route.ts
 * -----------------------------------------------------------------------
 * • PATCH /api/orders/cash-collections/:id
 *     – Admin‑only edit of a single cash‑collection record
 *     – Accepts any subset of { amount, status, settledById }
 *
 * • DELETE /api/orders/cash-collections/:id
 *     – Admin‑only hard delete of erroneous record
 * ---------------------------------------------------------------------*/

import { NextRequest, NextResponse }       from 'next/server';
import { getServerSession }                from 'next-auth/next';
import { authOptions }                     from '@/lib/auth';
import { prisma }                          from '@/lib/prisma';
import { CashCollectionStatus }            from '@prisma/client';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return Boolean(
    session?.user?.roles?.includes('ADMIN') ||
    session?.user?.roles?.includes('SUPERADMIN')
  );
}

/* ------------------------------------------------------------------ */
/*  PATCH  /api/cash-collections/:id                                   */
/* ------------------------------------------------------------------ */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const body = await req.json() as Partial<{
      amount:        number;
      status:        'PENDING' | 'SETTLED';
      settledById:   number | null; // null = unset
    }>;

    const data: any = {};
    if (typeof body.amount === 'number')       data.amount      = body.amount;
    if (body.status)                           data.status      = CashCollectionStatus[body.status];
    if ('settledById' in body)                 data.settledById = body.settledById;

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: 'No valid fields supplied' }, { status: 400 });

    if (data.status === CashCollectionStatus.SETTLED && !('settledById' in body)) {
      // auto‑stamp current admin if not provided
      const session = await getServerSession(authOptions);
      data.settledById = session?.user?.id ?? null;
      data.settledAt   = new Date();
    }

    const rec = await prisma.cashCollection.update({
      where: { id },
      data,
      include: {
        server:    { select: { firstName: true, lastName: true }},
        settledBy: { select: { firstName: true, lastName: true }},
        order:     { select: { orderId: true }},
      },
    });

    return NextResponse.json(rec);
  } catch (err: any) {
    console.error('[PATCH /api/cash-collections/:id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE  /api/cash-collections/:id                                  */
/* ------------------------------------------------------------------ */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await prisma.cashCollection.delete({ where: { id }});
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error('[DELETE /api/cash-collections/:id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
