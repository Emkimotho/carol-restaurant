/* ========================================================================== */
/*  File: app/api/orders/[id]/driver/route.ts                                 */
/* -------------------------------------------------------------------------- */
/*  PATCH  /api/orders/:id/driver                                             */
/*                                                                            */
/*  Request JSON body                                                         */
/*    {                                                                       */
/*      driverId:   number | null,   // 42  ► assign / re‑assign              */
/*                                     // null ► un‑assign                   */
/*      nextStatus?: OrderStatus       // optional status jump (admin only)   */
/*    }                                                                       */
/*                                                                            */
/*  Behaviour                                                                  */
/*    • When driverId is a number ‑ the order is (re)‑assigned to that driver */
/*      and remains in its current status unless `nextStatus` is provided.    */
/*    • When driverId is null      ‑ the driver is cleared (un‑assign).       */
/*      Admin/staff may also supply `nextStatus` to roll the order back to    */
/*      ORDER_READY (or any valid state) in the same request.                 */
/*                                                                            */
/*    • Every change is logged to OrderStatusHistory for auditing.            */
/*    • The route broadcasts WebSocket patches so all dashboards stay live.   */
/*                                                                            */
/*  All other logic is left exactly as‑was.                                   */
/* ========================================================================== */

import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'
import { OrderStatus }  from '@prisma/client'
import { broadcast }    from '../../live/route'

export async function PATCH (
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    /* ---------- path param ---------- */
    const orderId = params.id

    /* ---------- body ---------- */
    const { driverId, nextStatus } = await req.json()

    /* ---------- validation ---------- */
    if (driverId !== null && Number.isNaN(Number(driverId))) {
      return NextResponse.json(
        { error: '`driverId` must be numeric or null' },
        { status: 400 },
      )
    }

    /* ---------- build update payload ---------- */
    const data: Partial<{
      driverId: number | null
      status:   OrderStatus
    }> = {
      driverId: driverId === null ? null : Number(driverId),
    }

    /* optional status jump (admin / staff) */
    if (
      nextStatus &&
      (Object.values(OrderStatus) as string[]).includes(nextStatus)
    ) {
      data.status = nextStatus as OrderStatus
    }

    /* ---------- update row ---------- */
    const updated = await prisma.order.update({
      where: { id: orderId },
      data,
    })

    /* ---------- audit trail ---------- */
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status:    updated.status,
        changedBy: 'api:driver',        // 🔒 swap with auth email when available
      },
    })

    /* ---------- WebSocket patches ---------- */
    broadcast({ id: orderId, field: 'driverId', value: updated.driverId })
    if ('status' in data) {
      broadcast({ id: orderId, field: 'status', value: updated.status })
    }

    /* ---------- response ---------- */
    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[PATCH /api/orders/:id/driver] —', err)
    return NextResponse.json(
      { error: err.message ?? 'Server error' },
      { status: 500 },
    )
  }
}
