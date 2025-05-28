// File: app/dashboard/layout.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  FaBell,
  FaUserCircle,
  FaHome,
  FaUserTie,
  FaUsers,
  FaCashRegister,
  FaUtensils,
} from "react-icons/fa";
import styles from "./layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
}

type DashboardRole = "DRIVER" | "STAFF" | "CASHIER" | "SERVER";

export default function DashboardLayout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Bypass for full‐width admin & customer dashboards
  if (
    pathname.startsWith("/dashboard/admin-dashboard") ||
    pathname.startsWith("/dashboard/customer-dashboard")
  ) {
    return <>{children}</>;
  }

  // While session is loading, don’t render the sidebar
  if (status === "loading") {
    return null;
  }

  // If not logged in, just render children
  if (!session) {
    return <>{children}</>;
  }

  // Normalize roles to uppercase
  const rawRoles = (session.user as any).roles as string[] || [];
  const roles = rawRoles.map(r => r.toUpperCase());

  // Define every potential link
  const allItems: Array<{
    label: string;
    href: string;
    icon: React.ReactNode;
    requiredRole: DashboardRole | null;
  }> = [
    { label: "Home", href: "/dashboard", icon: <FaHome />, requiredRole: null },
    { label: "Driver", href: "/dashboard/driver-dashboard", icon: <FaUserTie />, requiredRole: "DRIVER" },
    { label: "Staff", href: "/dashboard/staff-dashboard", icon: <FaUsers />, requiredRole: "STAFF" },
    { label: "Cashier", href: "/dashboard/cashier-dashboard", icon: <FaCashRegister />, requiredRole: "CASHIER" },
    { label: "Server", href: "/dashboard/server-dashboard", icon: <FaUtensils />, requiredRole: "SERVER" },
  ];

  // Filter by the roles the user has
  const menuItems = allItems.filter(item =>
    item.requiredRole === null || roles.includes(item.requiredRole)
  );

  // Determine page title
  const current = menuItems.find(item => pathname.startsWith(item.href));
  const title = current
    ? current.label === "Home"
      ? "Dashboard"
      : `${current.label} Dashboard`
    : "Dashboard";

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>19th Hole&nbsp;@BR</div>
        <nav className={styles.nav}>
          {menuItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ""}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>{title}</h1>
          </div>
          <div className={styles.headerRight}>
            <Link href="/dashboard/profile" className={styles.iconButton} aria-label="Profile">
              <FaUserCircle />
            </Link>
            <button className={styles.iconButton} aria-label="Notifications">
              <FaBell />
              <span className={styles.badge}>3</span>
            </button>
            <button className={styles.logout} onClick={() => signOut()}>
              Logout
            </button>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
