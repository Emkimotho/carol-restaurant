"use client";

import React, { useState } from "react";
import Link from "next/link";
import styles from "@/components/dashboard/AdminDashboard/AdminDashboard.module.css";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  // State to control mobile sidebar visibility.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className={styles.dashboardContainer}>
      {/* Sidebar */}
      <aside className={`${styles.adminSidebar} ${sidebarOpen ? styles.open : ""}`}>
        <nav className={styles.sidebarNav}>
          <ul>
            <li>
              <Link href="/dashboard/admin-dashboard" className={styles.sidebarLink}>
                Dashboard Home
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin-dashboard/event-manager" className={styles.sidebarLink}>
                Events
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin-dashboard/opening-hours" className={styles.sidebarLink}>
                Hours
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin-dashboard/delivery-charge" className={styles.sidebarLink}>
                Delivery Charges
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin-dashboard/gallery" className={styles.sidebarLink}>
                Gallery
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin-dashboard/careers-manager" className={styles.sidebarLink}>
                Careers
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin-dashboard/blog-news" className={styles.sidebarLink}>
                Blog
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin-dashboard/feedback-center" className={styles.sidebarLink}>
                Feedback
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin-dashboard/user-management" className={styles.sidebarLink}>
                Users
              </Link>
            </li>
            <li>
              <Link href="/dashboard/admin-dashboard/settings" className={styles.sidebarLink}>
                Settings
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Content Wrapper */}
      <div className={styles.contentWrapper}>
        {/* Header */}
        <header className={styles.adminHeader}>
          <div className={styles.headerLeft}>
            {/* Mobile sidebar toggle button */}
            <button
              className={styles.sidebarToggle}
              onClick={toggleSidebar}
              aria-label="Toggle Sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={styles.hamburgerIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className={styles.logo}>
              <h1>Admin Panel</h1>
            </div>
          </div>
          <nav className={styles.headerNav}>
            <ul>
              <li>
                <Link href="/dashboard/admin-dashboard/orders" className={styles.headerLink}>
                  Orders
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin-dashboard/menu-builder" className={styles.headerLink}>
                  Menu Builder
                </Link>
              </li>
            </ul>
          </nav>
          <div className={styles.headerRight}>
            <button className={styles.notificationButton} aria-label="Notifications">
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
                  d="M15 17h5l-1.405-1.405C18.11 14.79 18 13.9 18 13V9a6 6 0 10-12 0v4c0 .9-.11 1.79-.595 2.595L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>
            <button className={styles.logoutButton}>Logout</button>
          </div>
        </header>
        {/* Main Content */}
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
