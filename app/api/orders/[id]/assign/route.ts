import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/orders/{id}/assign
 * Body: { driverId: string | number }
 *
 * 1. Validates that driverId is provided and numeric.
 * 2. Updates the order's driverId and sets status → ON_THE_WAY.
 * 3. Inserts a row in OrderStatusHistory for auditing.
 * 4. Returns the updated order.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { driverId } = await req.json();

    /* ---------- validation ---------- */
    if (!driverId && driverId !== 0)
      return NextResponse.json(
        { error: '`driverId` is required' },
        { status: 400 }
      );
    if (Number.isNaN(Number(driverId)))
      return NextResponse.json(
        { error: '`driverId` must be numeric' },
        { status: 400 }
      );

    /* ---------- update order ---------- */
    const updated = await prisma.order.update({
      where: { id: params.id },
      data: {
        driverId: Number(driverId),
        status: 'ON_THE_WAY',
      },
    });

    /* ---------- log history ---------- */
    await prisma.orderStatusHistory.create({
      data: {
        orderId: updated.id,
        status: updated.status,
        changedBy: `driver:${driverId}`,
      },
    });

    return NextResponse.json(updated); // send whole updated order
  } catch (err: any) {
    console.error('[PATCH /api/orders/:id/assign] -', err);
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    );
  }
}
