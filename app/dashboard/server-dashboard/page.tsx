'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import OrdersDashboard from '@/components/dashboard/OrdersDashboard/OrdersDashboard';
import styles from './ServerDashboard.module.css';

const TABS = [
  { label: 'Orders',       href: '/dashboard/server-dashboard' },
  { label: 'Tip Earnings', href: '/dashboard/server-dashboard/earnings' },
] as const;

export default function ServerDashboardPage() {
  const { data: session, status } = useSession();
  const router   = useRouter();
  const pathname = usePathname();

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/api/auth/signin');
    }
  }, [status, router]);

  // Loading state
  if (status === 'loading') {
    return <div className={styles.loading}>Loading…</div>;
  }

  // Extract numeric user ID
  const rawId = session?.user?.id;
  const userId = typeof rawId === 'string' ? Number(rawId) : rawId;
  if (!userId) {
    return <div className={styles.error}>Unable to determine your account. Please sign in again.</div>;
  }

  return (
    <div className={styles.container}>
      <nav className={styles.tabNav} role="tablist" aria-label="Server dashboard sections">
        {TABS.map(({ label, href }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={isActive ? styles.activeTab : styles.tab}
              prefetch={false}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <main className={styles.main} role="region" aria-labelledby="server-dashboard">
        <OrdersDashboard role="server" userId={userId} />
      </main>
    </div>
  );
}
