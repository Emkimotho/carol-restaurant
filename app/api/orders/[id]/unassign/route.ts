import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { broadcast } from '../../live/route';

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await Promise.resolve(params);

  /* ------------------------------------------------------------
   * When a driver unassigns an order, we:
   *   • clear driverId           (status remains unchanged)
   *   • broadcast driverId = null (so dashboards refresh)
   * ---------------------------------------------------------- */
  await prisma.order.update({
    where: { id },
    data:  { driverId: null },
  });

  broadcast({ id, field: 'driverId', value: null });

  return NextResponse.json({ ok: true });
}
