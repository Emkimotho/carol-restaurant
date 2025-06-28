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
  FaTicketAlt,
} from "react-icons/fa";
import styles from "./layout.module.css";

interface LayoutProps {
  children: React.ReactNode;
}

type DashboardRole =
  | "SUPERADMIN"
  | "ADMIN"
  | "STAFF"
  | "SERVER"
  | "CASHIER"
  | "DRIVER";

export default function DashboardLayout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Bypass layout wrapper for admin-dashboard & customer-dashboard if desired
  if (
    pathname.startsWith("/dashboard/admin-dashboard") ||
    pathname.startsWith("/dashboard/customer-dashboard")
  ) {
    return <>{children}</>;
  }

  // While session is loading, render nothing
  if (status === "loading") {
    return null;
  }

  // If not logged in, skip sidebar/layout
  if (!session) {
    return <>{children}</>;
  }

  // Extract and normalize roles to uppercase strings
  const rawRoles = (session.user as any).roles as string[] || [];
  const roles = rawRoles.map((r) => r.toUpperCase());

  // Define all possible sidebar items
  const allItems: Array<{
    label: string;
    href: string;
    icon: React.ReactNode;
    requiredRole: DashboardRole | null;
  }> = [
    { label: "Home",   href: "/dashboard",                    icon: <FaHome />,        requiredRole: null },
    { label: "Admin",  href: "/dashboard/admin-dashboard",    icon: <FaUserTie />,     requiredRole: "ADMIN" },
    { label: "Driver", href: "/dashboard/driver-dashboard",   icon: <FaUserTie />,     requiredRole: "DRIVER" },
    { label: "Server", href: "/dashboard/server-dashboard",   icon: <FaUtensils />,    requiredRole: "SERVER" },
    { label: "Cashier",href: "/dashboard/cashier-dashboard",  icon: <FaCashRegister />,requiredRole: "CASHIER" },
    // Keep the existing staff dashboard link
    { label: "Staff",  href: "/dashboard/staff-dashboard",    icon: <FaUsers />,       requiredRole: "STAFF" },
    // Add the new Verify Tickets link for staff roles
    { label: "Verify Tickets", href: "/dashboard/staff/verify-ticket", icon: <FaTicketAlt />, requiredRole: "STAFF" },
  ];

  // Filter items by whether the user has the required role
  const menuItems = allItems.filter(
    (item) =>
      item.requiredRole === null ||
      roles.includes(item.requiredRole)
  );

  // Determine the current page title
  const current = menuItems.find((item) =>
    pathname.startsWith(item.href)
  );
  const title =
    current?.label === "Home"
      ? "Dashboard"
      : current?.label || "Dashboard";

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>19th Hole&nbsp;@BR</div>
        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${
                pathname === item.href ? styles.active : ""
              }`}
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
            <Link
              href="/dashboard/profile"
              className={styles.iconButton}
              aria-label="Profile"
            >
              <FaUserCircle />
            </Link>
            <button
              className={styles.iconButton}
              aria-label="Notifications"
            >
              <FaBell />
              <span className={styles.badge}>3</span>
            </button>
            <button
              className={styles.logout}
              onClick={() => signOut()}
            >
              Logout
            </button>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
