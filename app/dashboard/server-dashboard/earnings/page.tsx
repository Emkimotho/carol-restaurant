// File: app/dashboard/server-dashboard/earnings/page.tsx
'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
// Adjust this import path if needed, but it should point to the file above:
import DriverEarnings from '@/app/dashboard/driver-dashboard/earnings/DriverEarnings';

export default function ServerEarningsPage() {
  const { data: session, status } = useSession();
  const serverId = session?.user?.id ? Number(session.user.id) : null;

  if (status === 'loading' || serverId === null) {
    return <p>Loading…</p>;
  }

  // Pass showDeliveryFee={false} to hide delivery‐fee columns
  return <DriverEarnings driverId={serverId} showDeliveryFee={false} />;
}
