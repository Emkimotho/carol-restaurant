// File: components/dashboard/AdminDashboard/AdminDashboard.tsx
/**
 * AdminDashboard.tsx
 *
 * Renders the main “home” of your admin panel:
 *  • DashboardContent: shows a greeting, stats grid, and a graph placeholder.
 *  • AdminDashboard: wraps DashboardContent in a <main> with proper styling.
 *
 * Flow:
 *  1. DashboardContent holds hard-coded placeholders; swap these out for live data hooks when ready.
 *  2. Stats are laid out in a responsive CSS grid.
 *  3. The graph placeholder uses Next/Image with fluid sizing.
 *  4. No authentication or layout concerns here—that’s handled by AdminLayout.
 */

"use client";

import React from "react";
import Image from "next/image";
import styles from "./AdminDashboard.module.css";

const DashboardContent: React.FC = () => (
  <div className={styles.dashboardContent}>
    <h1 className={styles.title}>Welcome, Admin!</h1>
    <p className={styles.subtitle}>
      Here’s a quick overview of your site’s performance.
    </p>

    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <h3 className={styles.statTitle}>Total Orders</h3>
        <p className={styles.statValue}>1,234</p>
      </div>
      <div className={styles.statCard}>
        <h3 className={styles.statTitle}>New Users</h3>
        <p className={styles.statValue}>56</p>
      </div>
      <div className={styles.statCard}>
        <h3 className={styles.statTitle}>Feedback Received</h3>
        <p className={styles.statValue}>89</p>
      </div>
      <div className={styles.statCard}>
        <h3 className={styles.statTitle}>Notifications</h3>
        <p className={styles.statValue}>12</p>
      </div>
    </div>

    <div className={styles.graphSection}>
      <h3 className={styles.graphTitle}>Sales Trend</h3>
      <Image
        className={styles.graphImage}
        src="/images/sample-graph.png"
        alt="Sales Trend Graph"
        width={600}
        height={400}
      />
    </div>
  </div>
);

const AdminDashboard: React.FC = () => (
  <main className={styles.mainContent}>
    <DashboardContent />
  </main>
);

export default AdminDashboard;
