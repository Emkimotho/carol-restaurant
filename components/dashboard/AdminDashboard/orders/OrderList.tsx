// File: components/dashboard/AdminDashboard/orders/OrderList.tsx

import React from "react";
import OrderRow, { Order as OrderType } from "./OrderRow";
import styles from "./OrderList.module.css";

// Re-export the Order type so it can be imported elsewhere.
export type Order = OrderType;

export interface OrderListProps {
  orders: Order[];
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onSelectOrder: (order: Order) => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onStatusUpdate, onSelectOrder }) => {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Status</th>
          <th>Total ($)</th>
          <th>Created At</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            onStatusUpdate={onStatusUpdate}
            onSelectOrder={onSelectOrder}
          />
        ))}
      </tbody>
    </table>
  );
};

export default OrderList;
