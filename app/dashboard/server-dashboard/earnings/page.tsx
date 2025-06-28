// File: app/dashboard/server-dashboard/earnings/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useSession }        from 'next-auth/react';
import { useRouter }         from 'next/navigation';
import Link                  from 'next/link';
import DriverEarnings        from '@/app/dashboard/driver-dashboard/earnings/DriverEarnings';
import styles                from '../ServerDashboard.module.css';

export default function ServerEarningsPage() {
  const { data: session, status } = useSession();
  const router                   = useRouter();

  // 1) Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/api/auth/signin');
    }
  }, [status, router]);

  // 2) Show loading state
  if (status === 'loading') {
    return <div className={styles.loading}>Loading…</div>;
  }

  // 3) Extract and validate user ID
  const rawId  = session?.user?.id;
  const serverId = typeof rawId === 'string' ? Number(rawId) : rawId;
  if (!serverId) {
    return (
      <div className={styles.error}>
        Unable to determine your account. Please sign in again.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* ← Orders button */}
      <div className={styles.backWrapper}>
        <Link href="/dashboard/server-dashboard" className={styles.backButton}>
          ← Orders
        </Link>
      </div>

      {/* Tip earnings component, hiding delivery‐fee columns */}
      <DriverEarnings driverId={serverId} showDeliveryFee={false} />
    </div>
  );
}
