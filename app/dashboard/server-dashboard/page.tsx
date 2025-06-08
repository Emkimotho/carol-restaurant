'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import OrdersDashboard from '@/components/dashboard/OrdersDashboard/OrdersDashboard';
import styles from './ServerDashboard.module.css';

export default function ServerDashboardPage() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const userId = session?.user?.id ? Number(session.user.id) : null;

  if (userId === null) return <p>Loading…</p>;

  return (
    <>
      <div className={styles.topBar}>
        <button
          className={
            pathname === '/dashboard/server-dashboard'
              ? styles.activeTabButton
              : styles.tabButton
          }
          onClick={() => router.push('/dashboard/server-dashboard')}
        >
          Orders
        </button>

        <button
          className={
            pathname === '/dashboard/server-dashboard/earnings'
              ? styles.activeTabButton
              : styles.tabButton
          }
          onClick={() => router.push('/dashboard/server-dashboard/earnings')}
        >
          Tip Earnings
        </button>
      </div>

      <OrdersDashboard role="server" userId={userId} />
    </>
  );
}
