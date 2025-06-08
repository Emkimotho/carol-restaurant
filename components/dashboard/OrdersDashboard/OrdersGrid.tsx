// File: components/dashboard/OrdersDashboard/OrdersGrid.tsx
// ───────────────────────────────────────────────────────────────────────
// Maps the filtered list → either an inline “server‐flow” card or,
// for all other roles, forwards props into the shared <OrderCard />.
// ───────────────────────────────────────────────────────────────────────

'use client';

import React from 'react';
import { Order } from './OrdersDashboard';
import styles from './orders.module.css';
import OrderCard from './OrderCard';
import type { Driver } from './DriverAssigner';

export interface OrdersGridProps {
  list: Order[];
  role: 'admin' | 'staff' | 'server' | 'cashier';
  drivers: Driver[]; // list of available drivers
  serverId?: number; // newly added: the current server’s userId
  mutate: () => void;
  onShowDetail: (o: Order) => void;
  onShowAgePatch: (patch: { order: Order; nextStatus: string; msg: string }) => void;
}

export default function OrdersGrid({
  list,
  role,
  drivers,
  serverId,      // ← receive serverId from parent
  mutate,
  onShowDetail,
  onShowAgePatch,
}: OrdersGridProps) {
  // If serverId is undefined (i.e. non‐server roles), it will be ignored below
  // Helper to PATCH order
  const patchOrder = async (id: string, body: Record<string, any>) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    mutate();
  };

  // Helper to create cash‐collection
  const createCashCollection = async (orderId: string, amount: number) => {
    if (!serverId) return;
    await fetch('/api/orders/cash-collections', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        serverId,       // ← use the passed‐in serverId
        amount,
        status: 'PENDING',
      }),
    });
    mutate();
  };

  return (
    <div className={styles.ordersGrid}>
      {list.map((o) => {
        // If we’re rendering the “server” dashboard, show inline server UI
        if (role === 'server') {
          return (
            <div key={o.id} className={styles.orderCard}>
              <div className={styles.cardHeader}>
                <span className={styles.orderId}>#{o.orderId}</span>

                {/* Payment method badge */}
                <span
                  className={
                    o.paymentMethod === 'CASH' ? styles.cashBadge : styles.badge
                  }
                >
                  {o.paymentMethod}
                </span>

                {/* Status badge (remap “PICKED_UP_BY_DRIVER” → “Picked Up (Server)”) */}
                <span className={styles.badge}>
                  {o.status === 'PICKED_UP_BY_DRIVER'
                    ? 'PICKED UP (SERVER)'
                    : o.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className={styles.cardBody}>
                <p>
                  <strong>Main:</strong> {o.items?.[0]?.title || '—'}
                </p>
                {o.holeNumber != null && (
                  <p>
                    <small>⛳ Hole: {o.holeNumber}</small>
                  </p>
                )}
                <p>
                  <small>💰 Total: ${o.totalAmount.toFixed(2)}</small>
                </p>
                <p>
                  <small>💵 Tip: ${o.tipAmount?.toFixed(2) || '0.00'}</small>
                </p>
              </div>

              <div className={styles.cardFooter}>
                {/* “Ready to Serve”: Claim Order if not yet claimed (no staffId) */}
                {o.status === 'ORDER_READY' && !o.staff && serverId && (
                  <button
                    className={styles.btn}
                    onClick={() =>
                      patchOrder(o.id, { driverId: null, staffId: serverId })
                    }
                  >
                    Claim Order
                  </button>
                )}

                {/* Still “ORDER_READY” but now claimed: Pick Up & Deliver */}
                {o.status === 'ORDER_READY' &&
                  o.staff &&
                  o.staff.firstName &&
                  serverId && (
                    <button
                      className={styles.btn}
                      onClick={() =>
                        patchOrder(o.id, { status: 'PICKED_UP_BY_DRIVER' })
                      }
                    >
                      Pick Up & Deliver
                    </button>
                  )}

                {/* After “PICKED_UP_BY_DRIVER”: Drive + (Collect Cash & Deliver) or (Mark Delivered) */}
                {o.status === 'PICKED_UP_BY_DRIVER' &&
                  o.staff &&
                  o.staff.firstName &&
                  serverId && (
                    <>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          o.deliveryAddress
                            ? `${o.deliveryAddress.street}, ${o.deliveryAddress.city}`
                            : ''
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <button className={styles.btnSecondary}>Drive</button>
                      </a>

                      {o.paymentMethod === 'CASH' ? (
                        <button
                          className={styles.btnDeliver}
                          onClick={async () => {
                            await patchOrder(o.id, { status: 'DELIVERED' });
                            await createCashCollection(o.id, o.totalAmount);
                          }}
                        >
                          Collect Cash & Deliver
                        </button>
                      ) : (
                        <button
                          className={styles.btnDeliver}
                          onClick={() =>
                            patchOrder(o.id, { status: 'DELIVERED' })
                          }
                        >
                          Mark Delivered
                        </button>
                      )}
                    </>
                  )}
              </div>
            </div>
          );
        }

        // For admin / staff / cashier, render the shared <OrderCard />
        return (
          <OrderCard
            key={o.id}
            order={o}
            role={role}
            drivers={drivers}
            mutate={mutate}
            onShowDetail={() => onShowDetail(o)}
            onShowAgePatch={(nextStatus, msg) =>
              onShowAgePatch({ order: o, nextStatus, msg })
            }
          />
        );
      })}

      {list.length === 0 && (
        <p className={styles.empty}>No orders in this section.</p>
      )}
    </div>
  );
}
