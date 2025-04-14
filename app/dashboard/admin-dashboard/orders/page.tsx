"use client";

import React, { useState } from "react";
import useSWR from "swr";
import styles from "@/app/dashboard/admin-dashboard/orders/orders.module.css";
import { Order } from "@/contexts/OrderContext";

// Simulated driver list – in production, fetch this list from your API
const drivers = [
  { id: "d1", name: "Driver A" },
  { id: "d2", name: "Driver B" },
  { id: "d3", name: "Driver C" },
];

// Simple fetcher for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Helper: Extracts the main dish name from the items array.
 * Assumes the first item is the main dish.
 */
const getMainItemName = (items: any[]): string => {
  if (!items || items.length === 0) return "No items";
  const mainItem = items[0];
  return mainItem.title || mainItem.name || "Unknown Dish";
};

/**
 * Helper: Generates a concise summary of accompaniments for the first item.
 * Returns a string like "Sauteed Kale (Extras: None)" only if options were selected.
 */
const getAccompanimentsSummary = (items: any[]): string | null => {
  if (!items || items.length === 0) return null;
  const mainItem = items[0];
  if (!mainItem.optionGroups || !mainItem.selectedOptions) return null;
  
  const accompaniments: string[] = [];
  mainItem.optionGroups.forEach((group: any) => {
    const groupState = mainItem.selectedOptions[group.id];
    if (groupState && groupState.selectedChoiceIds.length > 0) {
      // Use the group's title if available, otherwise use the group's id.
      const groupTitle = group.title || group.id;
      // List the labels for each selected choice.
      const choices = group.choices
        .filter((choice: any) => groupState.selectedChoiceIds.includes(choice.id))
        .map((choice: any) => {
          let nested = "";
          if (
            choice.nestedOptionGroup &&
            groupState.nestedSelections &&
            groupState.nestedSelections[choice.id] &&
            groupState.nestedSelections[choice.id].length > 0
          ) {
            nested =
              " (Extras: " +
              choice.nestedOptionGroup.choices
                .filter((n: any) =>
                  groupState.nestedSelections[choice.id].includes(n.id)
                )
                .map((n: any) => n.label || n.id)
                .join(", ") +
              ")";
          }
          return choice.label + nested;
        });
      accompaniments.push(`${groupTitle}: ${choices.join(", ")}`);
    }
  });
  return accompaniments.length > 0 ? accompaniments.join(" | ") : null;
};

/**
 * AdminOrdersDashboard:
 * - Displays orders in sleek order cards.
 * - Shows only essential details (Order ID, main dish, total, customer name/address).
 * - Includes inline controls to update status and assign drivers.
 * - Uses a modal to display full details when needed.
 */
const AdminOrdersDashboard: React.FC = () => {
  const { data: orders, error } = useSWR<Order[]>("/api/orders", fetcher, { refreshInterval: 5000 });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Handler to update order status; label changes based on current status.
  const handleUpdateStatus = async (order: Order) => {
    let newStatus = "";
    // Determine new status based on current status:
    // For simplicity, we follow a linear progression.
    if (order.status === "ORDER_RECEIVED") {
      newStatus = "IN_PROGRESS";
    } else if (order.status === "IN_PROGRESS") {
      newStatus = "ORDER_READY";
    } else if (order.status === "ORDER_READY") {
      newStatus = "PICKED_UP_BY_DRIVER";
    } else if (order.status === "PICKED_UP_BY_DRIVER") {
      newStatus = "ON_THE_WAY";
    } else if (order.status === "ON_THE_WAY") {
      newStatus = "DELIVERED";
    } else {
      // If already DELIVERED or unknown, do nothing.
      return;
    }
    // Here you should call your API endpoint to update the order's status.
    // We'll simulate with a console log.
    console.log(`Updating order ${order.orderId}: ${order.status} -> ${newStatus}`);
    // TODO: Implement API call. Then revalidate SWR cache.
  };

  // Handler: open modal with full details.
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  // Handler: assign driver using a dropdown.
  const handleAssignDriver = (order: Order, driverId: string) => {
    console.log(`Assigning driver ${driverId} to order ${order.orderId}`);
    // TODO: Call API endpoint here.
  };

  if (error) return <div className={styles.error}>Error loading orders.</div>;
  if (!orders) return <div className={styles.loading}>Loading orders...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Orders Dashboard</h1>
      <div className={styles.ordersGrid}>
        {orders.map((order) => {
          const mainItem = getMainItemName(order.items);
          const accompaniments = getAccompanimentsSummary(order.items);
          return (
            <div key={order.id || order.orderId} className={styles.orderCard}>
              <div className={styles.cardHeader}>
                <span className={styles.orderId}>#{order.orderId}</span>
                <span className={styles.orderStatus}>{order.status}</span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.mainItem}>
                  <strong>Main:</strong> {mainItem}
                </p>
                {accompaniments && (
                  <p className={styles.accompaniments}>
                    <strong>Add-ons:</strong> {accompaniments}
                  </p>
                )}
                {/* Minimal Customer Info */}
                <p className={styles.customerInfo}>
                  {order.customerName ? `Customer: ${order.customerName}` : ""}
                  {order.customerAddress ? ` - Addr: ${order.customerAddress}` : ""}
                </p>
                <p className={styles.total}>
                  <strong>Total: </strong>${order.totalAmount.toFixed(2)}
                </p>
              </div>
              <div className={styles.cardFooter}>
                <button className={styles.actionBtn} onClick={() => handleUpdateStatus(order)}>
                  {order.status === "ORDER_RECEIVED"
                    ? "Mark In Progress"
                    : order.status === "IN_PROGRESS"
                    ? "Mark Ready"
                    : order.status === "ORDER_READY"
                    ? "Mark Picked Up"
                    : order.status === "PICKED_UP_BY_DRIVER"
                    ? "Mark On The Way"
                    : order.status === "ON_THE_WAY"
                    ? "Mark Delivered"
                    : "Done"}
                </button>
                <button className={styles.actionBtn} onClick={() => handleViewDetails(order)}>
                  View Details
                </button>
                {order.orderType === "delivery" && (
                  <div className={styles.driverAssignment}>
                    <label htmlFor={`driver-${order.id}`} className={styles.driverLabel}>
                      Driver:
                    </label>
                    <select
                      id={`driver-${order.id}`}
                      className={styles.driverSelect}
                      onChange={(e) => handleAssignDriver(order, e.target.value)}
                    >
                      <option value="">Select Driver</option>
                      {drivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for viewing full order details */}
      {selectedOrder && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Order #{selectedOrder.orderId} Details</h2>
              <button className={styles.modalCloseBtn} onClick={() => setSelectedOrder(null)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                <strong>Status:</strong> {selectedOrder.status}
              </p>
              <p>
                <strong>Order Type:</strong> {selectedOrder.orderType}
              </p>
              {selectedOrder.orderType === "delivery" && selectedOrder.deliveryAddress && (
                <>
                  <p>
                    <strong>Delivery Address:</strong>{" "}
                    {selectedOrder.deliveryAddress.street},{" "}
                    {selectedOrder.deliveryAddress.city},{" "}
                    {selectedOrder.deliveryAddress.state}{" "}
                    {selectedOrder.deliveryAddress.zipCode}
                  </p>
                  {selectedOrder.deliveryAddress.deliveryOption && (
                    <p>
                      <strong>Delivery Option:</strong> {selectedOrder.deliveryAddress.deliveryOption}
                    </p>
                  )}
                </>
              )}
              <p>
                <strong>Total Amount:</strong> ${selectedOrder.totalAmount.toFixed(2)}
              </p>
              {selectedOrder.customerName && (
                <p>
                  <strong>Customer:</strong> {selectedOrder.customerName}
                </p>
              )}
              {selectedOrder.customerAddress && (
                <p>
                  <strong>Address:</strong> {selectedOrder.customerAddress}
                </p>
              )}
              <div className={styles.itemDetails}>
                <strong>Items:</strong>
                <ul className={styles.itemList}>
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <li key={idx}>
                      {item.title || item.name} x{item.quantity}
                      {item.specialInstructions && ` - ${item.specialInstructions}`}
                      {item.optionGroups && item.selectedOptions && (
                        <div className={styles.optionsDetails}>
                          {item.optionGroups.map((group: any) => {
                            const groupState = item.selectedOptions[group.id];
                            if (groupState && groupState.selectedChoiceIds.length > 0) {
                              return (
                                <div key={group.id}>
                                  <em>{group.title || "Option"}</em>:{" "}
                                  {group.choices
                                    .filter((choice: any) =>
                                      groupState.selectedChoiceIds.includes(choice.id)
                                    )
                                    .map((choice: any) => {
                                      let extras = "";
                                      if (
                                        choice.nestedOptionGroup &&
                                        groupState.nestedSelections &&
                                        groupState.nestedSelections[choice.id]
                                      ) {
                                        extras =
                                          " (" +
                                          choice.nestedOptionGroup.choices
                                            .filter((nested: any) =>
                                              groupState.nestedSelections[choice.id].includes(nested.id)
                                            )
                                            .map((nested: any) => nested.label)
                                            .join(", ") +
                                          ")";
                                      }
                                      return choice.label + extras;
                                    })
                                    .join(", ")}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersDashboard;
