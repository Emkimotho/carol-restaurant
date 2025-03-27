"use client";

import React from "react";
import styles from "./AdminDashboard.module.css";

const DashboardContent = () => (
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
      {/* Replace this placeholder image with an interactive chart component */}
      <img
        className={styles.graphImage}
        src="/images/sample-graph.png"
        alt="Sales Trend Graph"
      />
    </div>
  </div>
);

const AdminDashboard = () => (
  <main className={styles.mainContent}>
    <DashboardContent />
  </main>
);

export default AdminDashboard;
