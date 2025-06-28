// File: components/dashboard/AdminDashboard/AdminLayout.tsx
"use client";

import React, { useState, ReactNode } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  FaBars,
  FaTimes,
  FaBell,
} from "react-icons/fa";
import styles from "./AdminDashboard.module.css";

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  /* ------------------------------------------------------------------
     Local state: sidebar open/close
  -------------------------------------------------------------------*/
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  /* ------------------------------------------------------------------
     Header links (visible on desktop header bar)
  -------------------------------------------------------------------*/
  const headerLinks = [
    { href: "/dashboard/admin-dashboard",              label: "Dashboard Home" },
    { href: "/dashboard/admin-dashboard/orders",       label: "Orders" },
    { href: "/dashboard/admin-dashboard/menu-builder", label: "Menu Builder" },
    { href: "/dashboard/admin-dashboard/finances",     label: "Finances" },
    { href: "/dashboard/admin-dashboard/payouts",      label: "Payouts" },
    { href: "/dashboard/admin-dashboard/cash-audit",   label: "Cash Audit" },
    { href: "/dashboard/admin-dashboard/profile",      label: "Profile"  },
  ];

  /* ------------------------------------------------------------------
     Sidebar-only links (deeper admin nav)
  -------------------------------------------------------------------*/
  const sidebarLinks = [
    { href: "/dashboard/admin-dashboard/event-manager",   label: "Events" },
    { href: "/dashboard/admin-dashboard/opening-hours",   label: "Hours" },
    { href: "/dashboard/admin-dashboard/delivery-charge", label: "Delivery Charges" },
    { href: "/dashboard/admin-dashboard/banner",          label: "Banner" },
    { href: "/dashboard/admin-dashboard/gallery",         label: "Gallery" },
    { href: "/dashboard/admin-dashboard/subscriptions",   label: "Subscriptions" },
    { href: "/dashboard/admin-dashboard/menu-preview",    label: "Menu Preview" },
    { href: "/dashboard/admin-dashboard/careers-manager", label: "Careers" },
    { href: "/dashboard/admin-dashboard/blog-news",       label: "Blog" },
    { href: "/dashboard/admin-dashboard/feedback-center", label: "Feedback" },
    { href: "/dashboard/admin-dashboard/user-management", label: "Users" },
    { href: "/dashboard/admin-dashboard/register-user",   label: "Register User" },
    { href: "/dashboard/admin-dashboard/settings",        label: "Settings" },
  ];

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
          {/* Left side: hamburger + desktop nav */}
          <div className={styles.headerLeft}>
            {/* Burger toggle for mobile */}
            <button
              className={styles.sidebarToggle}
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <FaBars />
            </button>

            {/* Desktop header links */}
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

          {/* Right side: notifications + logout */}
          <div className={styles.headerRight}>
            <button
              className={styles.notificationButton}
              aria-label="Notifications"
            >
              <FaBell className={styles.notificationIcon} />
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

        {/* Sidebar drawer */}
        <aside
          className={`${styles.adminSidebar} ${
            sidebarOpen ? styles.open : ""
          }`}
        >
          {/* Close button for mobile */}
          <button
            className={styles.sidebarClose}
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <FaTimes />
          </button>

          {/* Combined nav: headerLinks + deeper sidebarLinks */}
          <nav className={styles.sidebarNav}>
            <ul>
              {headerLinks.map((link) => (
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
              <hr className={styles.divider} />
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
