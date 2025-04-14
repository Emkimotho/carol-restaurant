// File: components/dashboard/CustomerDashboard/CustomerDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import styles from "./CustomerDashboard.module.css";

// Define types (adjust based on your API response)
interface Order {
  id: string;
  date: string;
  status: string;
  total: number;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string | null;
  aptSuite: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

type DashboardSection = "profile" | "pending" | "past" | "edit";

const CustomerDashboard: React.FC = () => {
  const [section, setSection] = useState<DashboardSection>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Replace with your actual API endpoint
        const res = await fetch("/api/customer/dashboard");
        const data = await res.json();
        setProfile(data.profile);
        setPendingOrders(data.pendingOrders);
        setPastOrders(data.pastOrders);
      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const renderSection = () => {
    if (loading) return <p>Loading...</p>;
    switch (section) {
      case "profile":
        return (
          <div className={styles.sectionContent}>
            <h2>Profile</h2>
            {profile ? (
              <>
                <p>
                  <strong>Name:</strong> {profile.firstName} {profile.lastName}
                </p>
                <p>
                  <strong>Email:</strong> {profile.email}
                </p>
                <p>
                  <strong>Phone:</strong> {profile.phone}
                </p>
                <p>
                  <strong>Address:</strong>{" "}
                  {`${profile.streetAddress || ""} ${profile.aptSuite || ""}, ${profile.city || ""}, ${profile.state || ""} ${profile.zip || ""}, ${profile.country || ""}`}
                </p>
              </>
            ) : (
              <p>No profile data.</p>
            )}
          </div>
        );
      case "pending":
        return (
          <div className={styles.sectionContent}>
            <h2>Pending Orders</h2>
            {pendingOrders.length > 0 ? (
              <ul className={styles.orderList}>
                {pendingOrders.map((order) => (
                  <li key={order.id}>
                    <span>Order #{order.id}</span> – <span>{order.date}</span> –{" "}
                    <span>${order.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No pending orders.</p>
            )}
          </div>
        );
      case "past":
        return (
          <div className={styles.sectionContent}>
            <h2>Past Orders</h2>
            {pastOrders.length > 0 ? (
              <ul className={styles.orderList}>
                {pastOrders.map((order) => (
                  <li key={order.id}>
                    <span>Order #{order.id}</span> – <span>{order.date}</span> –{" "}
                    <span>${order.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No past orders.</p>
            )}
          </div>
        );
      case "edit":
        return (
          <div className={styles.sectionContent}>
            <h2>Edit Contact Info</h2>
            {/* Placeholder for edit form */}
            <p>You can edit your phone number and address here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <aside className={styles.sidebar}>
        <nav>
          <ul>
            <li
              className={section === "profile" ? styles.active : ""}
              onClick={() => setSection("profile")}
            >
              Profile
            </li>
            <li
              className={section === "pending" ? styles.active : ""}
              onClick={() => setSection("pending")}
            >
              Pending Orders
            </li>
            <li
              className={section === "past" ? styles.active : ""}
              onClick={() => setSection("past")}
            >
              Past Orders
            </li>
            <li
              className={section === "edit" ? styles.active : ""}
              onClick={() => setSection("edit")}
            >
              Edit Info
            </li>
          </ul>
        </nav>
      </aside>
      <main className={styles.mainContent}>{renderSection()}</main>
    </div>
  );
};

export default CustomerDashboard;
