// File: components/dashboard/AdminDashboard/AdminLayout.tsx
// ──────────────────────────────────────────────────────────────
//  Admin layout — now includes “Finances”, “Payouts”, and “Cash Audit” links in the header
// ──────────────────────────────────────────────────────────────

"use client";

import React, { useState }   from "react";
import Link                  from "next/link";
import { signOut }           from "next-auth/react";
import styles                from "./AdminDashboard.module.css";

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /* ------------------------------------------------------------------
     Local state: sidebar open/close
  -------------------------------------------------------------------*/
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar  = () => setSidebarOpen(false);

  /* ------------------------------------------------------------------
     Header links (visible on all screen sizes)
  -------------------------------------------------------------------*/
  const headerLinks = [
    { href: "/dashboard/admin-dashboard",              label: "Dashboard Home" },
    { href: "/dashboard/admin-dashboard/orders",       label: "Orders" },
    { href: "/dashboard/admin-dashboard/menu-builder", label: "Menu Builder" },
    { href: "/dashboard/admin-dashboard/finances",     label: "Finances" },
    { href: "/dashboard/admin-dashboard/payouts",      label: "Payouts" },
    { href: "/dashboard/admin-dashboard/cash-audit",   label: "Cash Audit" },    // ← added
    { href: "/dashboard/admin-dashboard/profile",      label: "Profile"  },
  ];

  /* ------------------------------------------------------------------
     Sidebar-only links (deeper admin nav)
  -------------------------------------------------------------------*/
  const sidebarLinks = [
    { href: "/dashboard/admin-dashboard/event-manager",   label: "Events" },
    { href: "/dashboard/admin-dashboard/opening-hours",   label: "Hours" },
    { href: "/dashboard/admin-dashboard/delivery-charge", label: "Delivery Charges" },
    { href: "/dashboard/admin-dashboard/gallery",         label: "Gallery" },
    { href: "/dashboard/admin-dashboard/careers-manager", label: "Careers" },
    { href: "/dashboard/admin-dashboard/blog-news",       label: "Blog" },
    { href: "/dashboard/admin-dashboard/feedback-center", label: "Feedback" },
    { href: "/dashboard/admin-dashboard/user-management", label: "Users" },
    { href: "/dashboard/admin-dashboard/register-user",   label: "Register User" },
    { href: "/dashboard/admin-dashboard/settings",        label: "Settings" },
  ];

  /* ------------------------------------------------------------------
     Render
  -------------------------------------------------------------------*/
  return (
    <div className={styles.dashboardContainer}>
      {/* ───────── HEADER ───────── */}
      <header className={styles.adminHeader}>
        {/* Top strip */}
        <div className={styles.headerTop}>
          <h1 className={styles.panelTitle}>Admin Panel</h1>
        </div>

        {/* Bottom bar */}
        <div className={styles.headerBottom}>
          {/* Left side: hamburger + nav */}
          <div className={styles.headerLeft}>
            <button
              className={styles.sidebarToggle}
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={styles.hamburgerIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <nav className={styles.headerNav}>
              {headerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={styles.headerLink}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side: logout */}
          <div className={styles.headerRight}>
            <button
              className={styles.notificationButton}
              aria-label="Notifications"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={styles.notificationIcon}
                fill="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.405-1.405C18.11 14.79 18 13.9 18 13V9a6 6 0 10-12
                     0v4c0 .9-.11 1.79-.595 2.595L4 17h5m6
                     0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>

            <button
              className={styles.logoutButton}
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ───────── BODY ───────── */}
      <div className={styles.body}>
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div className={styles.backdrop} onClick={closeSidebar} />
        )}

        {/* Sidebar */}
        <aside
          className={`${styles.adminSidebar} ${sidebarOpen ? styles.open : ""}`}
        >
          <button
            className={styles.sidebarClose}
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            &times;
          </button>

          <nav className={styles.sidebarNav}>
            <ul>
              {sidebarLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={styles.sidebarLink}
                    onClick={closeSidebar}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
