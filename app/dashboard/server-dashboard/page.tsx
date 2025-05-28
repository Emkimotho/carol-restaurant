// File: app/dashboard/server-dashboard/page.tsx
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import OrdersDashboard from '@/components/dashboard/OrdersDashboard/OrdersDashboard';

export default function ServerDashboardPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  if (!userId) return <p>Loading…</p>;
  return <OrdersDashboard role="server" userId={userId} />;
}
