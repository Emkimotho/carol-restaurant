// File: components/dashboard/AdminDashboard/orders/OrderStatusDropdown.tsx

import React from "react";
import styles from "./OrderStatusDropdown.module.css";

interface OrderStatusDropdownProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
}

const statusOptions = [
  { value: "ORDER_RECEIVED", label: "Order Received" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ORDER_READY", label: "Order Ready" },
  { value: "PICKED_UP_BY_DRIVER", label: "Picked Up by Driver" },
  { value: "ON_THE_WAY", label: "On the Way" },
  { value: "DELIVERED", label: "Delivered" },
];

const OrderStatusDropdown: React.FC<OrderStatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(event.target.value);
  };

  return (
    <div className={styles.dropdownContainer}>
      <label htmlFor="orderStatus">Update Status: </label>
      <select
        id="orderStatus"
        value={currentStatus}
        onChange={handleChange}
        className={styles.select}
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default OrderStatusDropdown;
