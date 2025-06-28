// File: app/dashboard/staff-dashboard/page.tsx
'use client';

/* ------------------------------------------------------------------ *
 *  Staff Dashboard Page                                              *
 *  Renders the OrdersDashboard component in “staff” mode, passing    *
 *  just the userId so that OrdersDashboard can fetch exactly the    *
 *  same orders the admin sees (minus pending/payment and cancelled). *
 * ------------------------------------------------------------------ */
import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import OrdersDashboard from '@/components/dashboard/OrdersDashboard/OrdersDashboard';
import styles from './StaffDashboard.module.css';

export default function StaffDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 1. Redirect to sign-in if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/api/auth/signin');
    }
  }, [status, router]);

  // 2. Show loading state
  if (status === 'loading') {
    return <p className={styles.loading}>Loading…</p>;
  }

  // 3. Guard: ensure we have a user ID
  const userId = session?.user?.id;
  if (!userId) {
    return (
      <p className={styles.error}>
        Could not load your account. Please sign in again.
      </p>
    );
  }

  // 4. Render the shared OrdersDashboard in "staff" mode
  return (
    <div className={styles.container}>
      <OrdersDashboard role="staff" userId={userId} />
    </div>
  );
}
