// app/dashboard/customer/orders/page.tsx
import React from 'react';
import { useAuth } from '../../../../contexts/AuthContext';

const CustomerOrderHistoryPage = () => {
  const { user } = useAuth();

  // Fetch order history based on user.id
  // This is a placeholder for actual data fetching logic

  const orders = [
    { id: 'order1', date: '2023-09-01', status: 'Delivered', total: '$50' },
    { id: 'order2', date: '2023-09-10', status: 'In Process', total: '$30' },
    // ... more orders
  ];

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold">Order History</h2>
      <table className="min-w-full mt-4 bg-white">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Order ID</th>
            <th className="py-2 px-4 border-b">Date</th>
            <th className="py-2 px-4 border-b">Status</th>
            <th className="py-2 px-4 border-b">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td className="py-2 px-4 border-b">{order.id}</td>
              <td className="py-2 px-4 border-b">{order.date}</td>
              <td className="py-2 px-4 border-b">{order.status}</td>
              <td className="py-2 px-4 border-b">{order.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerOrderHistoryPage;
