/* ----------------------------------------------------------------------
 *  File: app/dashboard/driver-dashboard/order/[id]/page.tsx
 * ----------------------------------------------------------------------
 *  Driver-side single-order screen
 *    • Live SWR polling (4 s) for order document
 *    • Context-sensitive action buttons
 *    • Shows deliveryInstructions after Confirm Pick-Up
 *    • Allows driver to Unassign before pick-up
 * -------------------------------------------------------------------- */

'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import cls from '../OrderDetail.module.css';
import { Order as BaseOrder } from '@/contexts/OrderContext';

/* ─── Local order type (deliveryAddress optional) ─── */
interface DriverOrder extends Omit<BaseOrder, 'deliveryAddress'> {
  driverId?: number | null;
  deliveryInstructions?: string | null;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

/* ─── Helpers ─── */
const fetcher = (url: string) => fetch(url).then(r => r.json());

// Your clubhouse/golf-course address:
const restaurantAddress = '20025 Mount Aetna Road, Hagerstown, MD 21742';

/* ─── Component ─── */
export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // SWR fetch + 4 s polling, expecting { order: DriverOrder }
  const { data, mutate } = useSWR<{ order: DriverOrder }>(
    `/api/orders/${id}`,
    fetcher,
    { refreshInterval: 4000 }
  );
  const order = data?.order;

  // If unassigned or cancelled, bounce back to list
  useEffect(() => {
    if (order && (order.driverId == null || order.status === 'CANCELLED')) {
      router.push('/dashboard/driver-dashboard');
    }
  }, [order, router]);

  if (!order) {
    return <p className={cls.msg}>Loading…</p>;
  }

  // Generic PATCH helper
  const patch = async (body: Record<string, any>) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    mutate();
  };

  // Unassign helper (back to list)
  const unassign = async () => {
    await fetch(`/api/orders/${id}/unassign`, { method: 'PATCH' });
    router.push('/dashboard/driver-dashboard');
  };

  /* ── Action buttons vary by status ── */
  const ActionButtons = () => {
    // Treat ORDER_RECEIVED+driverId as IN_PROGRESS
    const effectiveStatus =
      order.status === 'ORDER_RECEIVED' && order.driverId
        ? 'IN_PROGRESS'
        : order.status;

    switch (effectiveStatus) {
      // Claimed but not ready
      case 'IN_PROGRESS':
        return (
          <>
            <button
              className={cls.btn}
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    restaurantAddress
                  )}`,
                  '_blank'
                )
              }
            >
              Navigate to Restaurant
            </button>
            <button className={cls.btn} disabled>
              Arrive (await Ready)
            </button>
            <button className={cls.btnOutline} onClick={unassign}>
              Unassign
            </button>
          </>
        );

      // Chef marked it ready
      case 'ORDER_READY':
        return (
          <button
            className={cls.btn}
            onClick={() => patch({ status: 'ON_THE_WAY' })}
          >
            Confirm Pick-Up
          </button>
        );

      // On the way
      case 'ON_THE_WAY':
        return (
          <>
            <button
              className={cls.btn}
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    `${order.deliveryAddress?.street}, ${order.deliveryAddress?.city}, ${order.deliveryAddress?.state} ${order.deliveryAddress?.zipCode}`
                  )}`,
                  '_blank'
                )
              }
            >
              Navigate to Customer
            </button>
            <button
              className={cls.btn}
              onClick={() =>
                patch({ status: 'DELIVERED' }).then(() =>
                  router.push('/dashboard/driver-dashboard')
                )
              }
            >
              Deliver
            </button>
          </>
        );

      default:
        return null;
    }
  };

  /* ── Stepper UI ── */
  const STEPS = ['IN_PROGRESS', 'ORDER_READY', 'ON_THE_WAY', 'DELIVERED'] as const;
  type Step = typeof STEPS[number];

  const stepClass = (s: Step) =>
    s === order.status
      ? cls.active
      : STEPS.indexOf(s) < STEPS.indexOf(order.status as Step)
      ? cls.done
      : '';

  /* ── Render ── */
  return (
    <div className={cls.wrap}>
      <h2 className={cls.title}>Order #{order.orderId}</h2>

      <ul className={cls.stepper}>
        {STEPS.map((s) => (
          <li key={s} className={stepClass(s)}>
            {s.replace(/_/g, ' ')}
          </li>
        ))}
      </ul>

      <section className={cls.panel}>
        <h3>Items</h3>
        {order.items?.length ? (
          order.items.map((it: any, i: number) => (
            <p key={i}>
              {(it.title || it.name) ?? '—'} ×{it.quantity ?? 1}
            </p>
          ))
        ) : (
          <p>—</p>
        )}
      </section>

      {order.orderType === 'delivery' && order.deliveryAddress && (
        <section className={cls.panel}>
          <h3>Delivery Address</h3>
          <p>
            {order.deliveryAddress.street}, {order.deliveryAddress.city}
          </p>
          <p>
            {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
          </p>
        </section>
      )}

      {/* Show instructions after pick-up */}
      {order.orderType === 'delivery' &&
        order.deliveryInstructions &&
        ['ON_THE_WAY', 'DELIVERED'].includes(order.status) && (
          <section className={cls.panel}>
            <h3>Delivery Instructions</h3>
            <p>{order.deliveryInstructions}</p>
          </section>
        )}

      <section className={cls.actions}>
        <ActionButtons />
      </section>

      <button className={cls.back} onClick={() => router.back()}>
        ← Back
      </button>
    </div>
  );
}
