// File: components/dashboard/OrdersDashboard/OrdersGrid.tsx
// ───────────────────────────────────────────────────────────────────────
// Maps each order → purpose-built card:
//   • Driver dashboards get a compact “driver card” with the exact
//     action buttons (Claim ▸ Picked-Up ▸ On-The-Way ▸ Delivered).
//   • Server dashboard keeps the cash-collection flow card.
//   • All other roles fall through to the shared <OrderCard/>.
// Fixes
// -----
// ✔ use order.driver?.id instead of non-existent order.driverId  
// ✔ Accept extended role union ('driver' / 'driverMine' / 'staffMine')  
// ✔ Narrow role when forwarding to <OrderCard> so TypeScript is happy  
// ✔ No logic removed—only clarified.
// ───────────────────────────────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import type { Order } from './types';
import styles from './OrdersGrid.module.css';
import OrderCard from './OrderCard';
import type { Driver } from './DriverAssigner';

/* ------------------------------------------------------------------ */
/* Cash-collection modal (server flow)                                */
/* ------------------------------------------------------------------ */
function CashCollectModal({
  total,
  onConfirm,
  onClose,
}: {
  total: number;
  onConfirm: (cashGiven: number) => void;
  onClose: () => void;
}) {
  const [cash, setCash] = useState('');
  const given = Number(cash) || 0;
  const change = given > total ? (given - total).toFixed(2) : '0.00';

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <h3>Collect Cash</h3>
        <p>
          Total due:&nbsp;<strong>${total.toFixed(2)}</strong>
        </p>
        <label>
          Cash given:&nbsp;
          <input
            type="number"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
        </label>
        <p>
          Change to return:&nbsp;<strong>${change}</strong>
        </p>
        <div className={styles.modalBtns}>
          <button onClick={() => onConfirm(given)} className="btn">
            Confirm
          </button>
          <button onClick={onClose} className="btn secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */
export interface OrdersGridProps {
  list: Order[];
  role:
    | 'admin'
    | 'staff'
    | 'staffMine'
    | 'server'
    | 'cashier'
    | 'driver'
    | 'driverMine';
  drivers: Driver[];
  driverId?: number; // required for driver/driverMine
  serverId?: number; // for server-flow cash collection
  mutate: () => void;
  onShowDetail: (order: Order) => void;
  onShowAgePatch: (patch: { order: Order; nextStatus: string; msg: string }) => void;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function OrdersGrid({
  list,
  role,
  drivers,
  driverId,
  serverId,
  mutate,
  onShowDetail,
  onShowAgePatch,
}: OrdersGridProps) {
  const [modalFor, setModalFor] = useState<Order | null>(null);

  // PATCH only status
  const patchStatus = async (id: string, status: string) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    mutate();
  };

  // PATCH only driverId via specialized driver route
  const patchDriver = async (id: string, driverId: number | null) => {
    await fetch(`/api/orders/${id}/driver`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
    mutate();
  };

  // POST cash collection
  const createCashCollection = async (orderId: string, amount: number) => {
    if (!serverId) return;
    try {
      await fetch('/api/orders/cash-collections', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, serverId, amount }),
      });
    } catch {
      /* swallow duplicate errors */
    }
    mutate();
  };

  return (
    <>
      {modalFor && (
        <CashCollectModal
          total={modalFor.totalAmount}
          onConfirm={async (cashGiven) => {
            await patchStatus(modalFor.id, 'DELIVERED');
            await createCashCollection(modalFor.id, cashGiven);
            setModalFor(null);
          }}
          onClose={() => setModalFor(null)}
        />
      )}

      <div className={styles.ordersGrid}>
        {list.map((order) => {
          // 1) Driver-dashboard cards
          if ((role === 'driver' || role === 'driverMine') && driverId != null) {
            const mine = order.driver?.id === driverId;
            const unclaimed = order.driver == null;
            const canClaim = unclaimed && order.status === 'ORDER_RECEIVED';
            const canPickUp = mine && order.status === 'ORDER_READY';
            const canOnWay = mine && order.status === 'PICKED_UP_BY_DRIVER';
            const canDeliver = mine && order.status === 'ON_THE_WAY';

            return (
              <div key={order.id} className={styles.orderCard}>
                {/* header */}
                <div className={styles.cardHeader}>
                  <span className={styles.orderId}>#{order.orderId}</span>
                  <span className={styles.badge}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* body */}
                <div className={styles.cardBody}>
                  <p>
                    <strong>Main:</strong> {order.items?.[0]?.title || '—'}
                  </p>
                  {order.holeNumber != null && (
                    <p>
                      <small>⛳ Hole {order.holeNumber}</small>
                    </p>
                  )}
                  <p>
                    <small>💰 Total: ${order.totalAmount.toFixed(2)}</small>
                  </p>
                  {mine && (
                    <p>
                      <small>
                        <em>— assigned to you —</em>
                      </small>
                    </p>
                  )}
                  {unclaimed && (
                    <p>
                      <small>Un-assigned</small>
                    </p>
                  )}
                </div>

                {/* footer / driver actions */}
                <div className={styles.cardFooter}>
                  {canClaim && (
                    <button
                      className={styles.actionBtn}
                      onClick={() => patchDriver(order.id, driverId)}
                    >
                      Claim Order
                    </button>
                  )}

                  {canPickUp && (
                    <button
                      className={styles.actionBtn}
                      onClick={() =>
                        patchStatus(order.id, 'PICKED_UP_BY_DRIVER')
                      }
                    >
                      Picked Up
                    </button>
                  )}

                  {canOnWay && (
                    <button
                      className={styles.actionBtn}
                      onClick={() =>
                        patchStatus(order.id, 'ON_THE_WAY')
                      }
                    >
                      On The Way
                    </button>
                  )}

                  {canDeliver && (
                    <button
                      className={styles.actionBtn}
                      onClick={() =>
                        patchStatus(order.id, 'DELIVERED')
                      }
                    >
                      Delivered
                    </button>
                  )}

                  {!canClaim &&
                    !canPickUp &&
                    !canOnWay &&
                    !canDeliver && (
                      <button
                        className={styles.disabledBtn}
                        disabled
                      >
                        Waiting…
                      </button>
                    )}
                </div>
              </div>
            );
          }

          // 2) Server flow cards
          if (role === 'server') {
            const alreadyCollected = Boolean(order.cashCollection);

            return (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.cardHeader}>
                  <span className={styles.orderId}>#{order.orderId}</span>
                  <span
                    className={
                      order.paymentMethod === 'CASH'
                        ? styles.cashBadge
                        : styles.badgeCard
                    }
                  >
                    {order.paymentMethod}
                  </span>
                  <span className={styles.badge}>
                    {order.status === 'PICKED_UP_BY_DRIVER'
                      ? 'PICKED UP (SERVER)'
                      : order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <p>
                    <strong>Main:</strong> {order.items?.[0]?.title || '—'}
                  </p>
                  {order.holeNumber != null && (
                    <p>
                      <small>⛳ Hole {order.holeNumber}</small>
                    </p>
                  )}
                  <p>
                    <small>💰 Total: ${order.totalAmount.toFixed(2)}</small>
                  </p>
                  <p>
                    <small>
                      💵 Tip: ${order.tipAmount?.toFixed(2) ?? '0.00'}
                    </small>
                  </p>
                </div>
                <div className={styles.cardFooter}>
                  {order.status === 'ORDER_READY' &&
                    !order.staff &&
                    serverId && (
                      <button
                        className={styles.actionBtn}
                        onClick={() =>
                          patchDriver(order.id, null)
                        }
                      >
                        Claim Order
                      </button>
                    )}


                  {order.status === 'ORDER_READY' &&
                    order.staff &&
                    serverId && (
                      <button
                        className={styles.actionBtn}
                        onClick={() =>
                          patchStatus(order.id, 'PICKED_UP_BY_DRIVER')
                        }
                      >
                        Pick Up & Deliver
                      </button>
                    )}


                  {order.status === 'PICKED_UP_BY_DRIVER' &&
                    order.staff &&
                    serverId && (
                      <>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                            `${order.deliveryAddress?.street ?? ''}, ${order.deliveryAddress?.city ?? ''}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <button className={styles.actionBtn}>
                            Drive
                          </button>
                        </a>
                        {order.paymentMethod === 'CASH' ? (
                          <button
                            className={styles.actionBtn}
                            disabled={alreadyCollected}
                            onClick={() => setModalFor(order)}
                          >
                            {alreadyCollected
                              ? 'Cash Collected'
                              : 'Collect Cash & Deliver'}
                          </button>
                        ) : (
                          <button
                            className={styles.actionBtn}
                            onClick={() =>
                              patchStatus(order.id, 'DELIVERED')
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

          // 3) Admin/Staff/Cashier generic card
          let cardRole: 'admin' | 'staff' | 'cashier';
          if (role === 'admin') cardRole = 'admin';
          else if (role === 'staff' || role === 'staffMine') cardRole = 'staff';
          else cardRole = 'cashier';

          return (
            <OrderCard
              key={order.id}
              order={order}
              role={cardRole}
              drivers={drivers}
              mutate={mutate}
              onShowDetail={() => onShowDetail(order)}
              onShowAgePatch={(nextStatus, msg) =>
                onShowAgePatch({ order, nextStatus, msg })
              }
            />
          );
        })}

        {list.length === 0 && (
          <p className={styles.empty}>No orders in this section.</p>
        )}
      </div>
    </>
  );
}
