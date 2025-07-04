/* =======================================================================
 * File: app/api/orders/cash-collections/[id]/route.ts
 * -----------------------------------------------------------------------
 *
 *     – Admin-only edit / delete of a single cash-collection record
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

  // 🔍 Diagnostic dump – keep or remove as you prefer
  console.log('[cash-collections] session:', JSON.stringify(session, null, 2));

  // Case-insensitive role check
  const roles = (session?.user?.roles ?? []).map(r => r.toUpperCase());
  return roles.includes('ADMIN') || roles.includes('SUPERADMIN');
}

/* ------------------------------------------------------------------ */
/*  PATCH  /api/cash-collections/:id                                   */
/* ------------------------------------------------------------------ */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const body = (await req.json()) as Partial<{
      amount:      number;
      status:      'PENDING' | 'SETTLED';
      settledById: number | null;
    }>;

    const data: any = {};
    if (typeof body.amount === 'number') data.amount = body.amount;
    if (body.status)                     data.status = CashCollectionStatus[body.status];
    if ('settledById' in body)           data.settledById = body.settledById;

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: 'No valid fields supplied' }, { status: 400 });

    if (data.status === CashCollectionStatus.SETTLED && !('settledById' in body)) {
      const session = await getServerSession(authOptions);
      data.settledById = session?.user?.id ?? null;
      data.settledAt   = new Date();
    }

    const rec = await prisma.cashCollection.update({
      where: { id },
      data,
      include: {
        server:    { select: { firstName: true, lastName: true } },
        settledBy: { select: { firstName: true, lastName: true } },
        order:     { select: { orderId: true } },
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
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const existing = await prisma.cashCollection.findUnique({ where: { id } });
    console.log('[DELETE cash-collection] existing record:', existing);

    if (!existing)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.cashCollection.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error('[DELETE /api/cash-collections/:id]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
