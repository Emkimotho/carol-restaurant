// File: app/dashboard/cashier-dashboard/page.tsx
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import OrdersDashboard from '@/components/dashboard/OrdersDashboard/OrdersDashboard';

export default function CashierDashboardPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  if (!userId) return <p>Loading…</p>;
  return <OrdersDashboard role="cashier" userId={userId} />;
}
