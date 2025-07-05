// File: components/dashboard/AdminDashboard/AdminDashboard.tsx
"use client";

import React from "react";
import useSWR from "swr";
import { ShoppingCart, User, MessageCircle, CalendarDays } from "lucide-react";
import StatsGrid from "../StatsGrid";
import StatsCard from "../StatsCard";
import SalesTrendChart from "../SalesTrendChart";
import { fetcher } from "@/lib/fetcher";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboard() {
  const { data: orders } = useSWR<{ count: number }>(
    "/api/dashboard/orders/count",
    fetcher
  );
  const { data: users } = useSWR<{ count: number }>(
    "/api/dashboard/users/count",
    fetcher
  );
  const { data: feedback } = useSWR<{ count: number }>(
    "/api/dashboard/feedback/count",
    fetcher
  );
  const { data: events } = useSWR<{ count: number }>(
    "/api/dashboard/events/count",
    fetcher
  );

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome Back, Admin!</h1>
        <p className={styles.subtitle}>
          Here’s a quick look at what’s happening today.
        </p>
      </header>

      <StatsGrid>
        <StatsCard
          icon={<ShoppingCart size={32} />}
          label="Total Orders"
          value={orders?.count}
        />
        <StatsCard
          icon={<User size={32} />}
          label="New Users"
          value={users?.count}
        />
        <StatsCard
          icon={<MessageCircle size={32} />}
          label="Feedback Received"
          value={feedback?.count}
        />
        <StatsCard
          icon={<CalendarDays size={32} />}
          label="Events"
          value={events?.count}
        />
      </StatsGrid>

      <section className={styles.chartSection}>
        <h2 className={styles.sectionTitle}>Sales Trend</h2>
        <SalesTrendChart />
      </section>
    </main>
  );
}
