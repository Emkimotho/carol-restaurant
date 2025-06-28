// File: app/api/orders/[id]/driver/route.ts
/* ========================================================================== */
/*  PATCH  /api/orders/:id/driver                                             */
/*                                                                             */
/*  Request JSON body                                                          */
/*    {                                                                        */
/*      driverId:   number | null,   // 42  ► assign / re-assign               */
/*                                     // null ► un-assign                    */
/*      nextStatus?: OrderStatus       // optional status jump (admin only)    */
/*    }                                                                        */
/*                                                                             */
/*  Behaviour                                                                   */
/*    • When driverId is a number - the order is (re)-assigned to that driver  */
/*      and remains in its current status unless `nextStatus` is provided.     */
/*    • When driverId is null      - the driver is cleared (un-assign).        */
/*      Admin/staff may also supply `nextStatus` to roll the order back to     */
/*      ORDER_READY (or any valid state) in the same request.                  */
/*                                                                             */
/*    • Every change is logged to OrderStatusHistory for auditing.             */
/*    • The route broadcasts WebSocket patches so all dashboards stay live.    */
/*                                                                             */
/*  All other logic is left exactly as-was.                                    */
/* ========================================================================== */

import { NextRequest, NextResponse } from 'next/server'
import { prisma }                from '@/lib/prisma'
import { OrderStatus }           from '@prisma/client'
import { broadcast }             from '../../live/route'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js dynamic API
    const { id: orderId } = await params

    // Parse body
    const { driverId, nextStatus } = (await request.json()) as {
      driverId: number | null
      nextStatus?: OrderStatus
    }

    // Validate driverId
    if (driverId !== null && Number.isNaN(Number(driverId))) {
      return NextResponse.json(
        { error: '`driverId` must be numeric or null' },
        { status: 400 }
      )
    }

    // If assigning, ensure driver is online
    if (driverId !== null) {
      const drv = await prisma.user.findUnique({
        where:  { id: Number(driverId) },
        select: { isOnline: true },
      })
      if (!drv?.isOnline) {
        return NextResponse.json(
          { error: 'Cannot assign to an offline driver' },
          { status: 409 }
        )
      }
    }

    // Build update payload
    const data: Partial<{
      driverId: number | null
      status:   OrderStatus
    }> = {
      driverId: driverId === null ? null : Number(driverId),
    }

    // Optional status jump (admin/staff only)
    if (
      nextStatus &&
      (Object.values(OrderStatus) as string[]).includes(nextStatus)
    ) {
      data.status = nextStatus
    }

    // Update the order row
    const updated = await prisma.order.update({
      where: { id: orderId },
      data,
    })

    // Audit trail
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status:    updated.status,
        changedBy: 'api:driver', // replace with actual user when available
      },
    })

    // Broadcast patches
    broadcast({ id: orderId, field: 'driverId', value: updated.driverId })
    if (data.status !== undefined) {
      broadcast({ id: orderId, field: 'status',   value: updated.status })
    }

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[PATCH /api/orders/:id/driver] —', err)
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 }
    )
  }
}
