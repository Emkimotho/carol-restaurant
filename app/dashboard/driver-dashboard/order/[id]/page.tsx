// File: app/dashboard/driver-dashboard/order/[id]/page.tsx
// ----------------------------------------------------------------------
// Driver-side single-order screen
//  • Polls order every 4s with SWR
//  • Calls /driver route for claim/unassign (no status flip)
//  • Calls /api/orders/:id for real status changes
// ----------------------------------------------------------------------

'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import cls from '../OrderDetail.module.css';
import type { Order as BaseOrder } from '@/contexts/OrderContext';

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

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => r.json());

const RESTAURANT_ADDRESS =
  process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS ||
  '20025 Mount Aetna Road, Hagerstown, MD 21742';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // 1) Fetch live order
  const { data, mutate } = useSWR<{ order: DriverOrder }>(
    `/api/orders/${id}`,
    fetcher,
    { refreshInterval: 4000 }
  );
  const order = data?.order;

  // Redirect if unassigned or cancelled
  useEffect(() => {
    if (!order) return;
    if (order.driverId == null || order.status === 'CANCELLED') {
      router.push('/dashboard/driver-dashboard');
    }
  }, [order, router]);

  if (!order) return <p className={cls.msg}>Loading…</p>;

  // 2) Assign/unassign via dedicated driver route
  const setDriver = async (driverId: number | null) => {
    await fetch(`/api/orders/${id}/driver`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    mutate();
  };

  // 3) Real status changes via generic route
  const changeStatus = async (status: string) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    mutate();
  };

  const ActionButtons = () => {
    // Before pickup: show Navigate & Release, plus Arrive only on RECEIVED
    if (order.status === 'ORDER_RECEIVED' || order.status === 'ORDER_READY') {
      return (
        <>
          <button
            className={cls.btn}
            onClick={() =>
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  RESTAURANT_ADDRESS
                )}`,
                '_blank'
              )
            }
          >
            Navigate to Restaurant
          </button>

          {order.status === 'ORDER_RECEIVED' && (
            <button className={cls.btn} disabled>
              Arrive (Wait Ready)
            </button>
          )}

          <button
            className={cls.btnOutline}
            onClick={() => setDriver(null)}
          >
            Release / Unassign
          </button>

          {order.status === 'ORDER_READY' && (
            <button
              className={cls.btn}
              onClick={() => changeStatus('PICKED_UP_BY_DRIVER')}
            >
              Pick Up
            </button>
          )}
        </>
      );
    }

    // After pickup transitions
    switch (order.status) {
      case 'PICKED_UP_BY_DRIVER':
        return (
          <button
            className={cls.btn}
            onClick={() => changeStatus('ON_THE_WAY')}
          >
            Start Trip
          </button>
        );

      case 'ON_THE_WAY':
        return (
          <>
            <button
              className={cls.btn}
              onClick={() =>
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                    `${order.deliveryAddress?.street ?? ''}, ${order.deliveryAddress?.city ?? ''}`
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
                changeStatus('DELIVERED').then(() =>
                  router.push('/dashboard/driver-dashboard')
                )
              }
            >
              Mark Delivered
            </button>
          </>
        );

      default:
        return null;
    }
  };

  const STEPS = [
    'ORDER_RECEIVED',
    'ORDER_READY',
    'PICKED_UP_BY_DRIVER',
    'ON_THE_WAY',
    'DELIVERED',
  ] as const;
  type Step = typeof STEPS[number];
  const stepCls = (s: Step) =>
    s === order.status
      ? cls.active
      : STEPS.indexOf(s) < STEPS.indexOf(order.status as Step)
      ? cls.done
      : '';

  return (
    <div className={cls.wrap}>
      <h2 className={cls.title}>Order #{order.orderId}</h2>
      <p className={cls.status}>
        Status: {order.status.replace(/_/g, ' ')}
      </p>

      <ul className={cls.stepper}>
        {STEPS.map(s => (
          <li key={s} className={stepCls(s)}>
            {s.replace(/_/g, ' ')}
          </li>
        ))}
      </ul>

      <section className={cls.panel}>
        <h3>Items</h3>
        {(order.items ?? []).length > 0 ? (
          order.items.map((it, i) => (
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
            {order.deliveryAddress.state}{' '}
            {order.deliveryAddress.zipCode}
          </p>
        </section>
      )}

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
