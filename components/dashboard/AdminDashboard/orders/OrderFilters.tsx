// File: components/dashboard/AdminDashboard/orders/OrderFilters.tsx

import React from "react";
import styles from "./OrderFilters.module.css";

interface OrderFiltersProps {
  statusFilter: string;
  onFilterChange: (status: string) => void;
}

const OrderFilters: React.FC<OrderFiltersProps> = ({ statusFilter, onFilterChange }) => {
  return (
    <div className={styles.filterContainer}>
      <label htmlFor="statusFilter">Filter by Status:</label>
      <select
        id="statusFilter"
        value={statusFilter}
        onChange={(e) => onFilterChange(e.target.value)}
      >
        <option value="">All</option>
        <option value="ORDER_RECEIVED">Order Received</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="ORDER_READY">Order Ready</option>
        <option value="PICKED_UP_BY_DRIVER">Picked Up by Driver</option>
        <option value="ON_THE_WAY">On the Way</option>
        <option value="DELIVERED">Delivered</option>
      </select>
    </div>
  );
};

export default OrderFilters;
