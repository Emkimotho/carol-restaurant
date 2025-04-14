// File: components/dashboard/AdminDashboard/orders/OrderRow.tsx

import React from "react";
import styles from "./OrderRow.module.css";

export interface Order {
  id: string;
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  // Add additional fields as needed.
}

interface OrderRowProps {
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onSelectOrder: (order: Order) => void;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, onStatusUpdate, onSelectOrder }) => {
  const handleUpdate = (newStatus: string) => {
    onStatusUpdate(order.id, newStatus);
  };

  return (
    <tr className={styles.row}>
      <td>{order.orderId}</td>
      <td>{order.status}</td>
      <td>{order.totalAmount.toFixed(2)}</td>
      <td>{new Date(order.createdAt).toLocaleString()}</td>
      <td className={styles.actions}>
        <button className={styles.button} onClick={() => onSelectOrder(order)}>
          View Details
        </button>
        <button className={styles.button} onClick={() => handleUpdate("IN_PROGRESS")}>
          Mark In Progress
        </button>
        <button className={styles.button} onClick={() => handleUpdate("ORDER_READY")}>
          Mark Ready
        </button>
        <button className={styles.button} onClick={() => handleUpdate("DELIVERED")}>
          Mark Delivered
        </button>
      </td>
    </tr>
  );
};

export default OrderRow;
