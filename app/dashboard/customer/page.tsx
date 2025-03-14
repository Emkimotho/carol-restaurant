// File: app/dashboard/customer/page.tsx

import React from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute/ProtectedRoute';

export const metadata = {
  title: 'Customer Dashboard - The 19th Hole',
  description: 'Access your account details, orders, and preferences.',
};

export default function CustomerDashboard() {
  return (
    <ProtectedRoute>
      <div>
        <h1>Customer Dashboard</h1>
        {/* Dashboard content */}
      </div>
    </ProtectedRoute>
  );
}
