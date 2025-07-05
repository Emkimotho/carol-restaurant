// components/dashboard/StatsCard.tsx
"use client";

import React from "react";
import styles from "./StatsCard.module.css"; // create this CSS-module or add to your global styles

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string | undefined;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, label, value }) => (
  <div className={styles.card}>
    <div className={styles.icon}>{icon}</div>
    <div className={styles.details}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value ?? "—"}</div>
    </div>
  </div>
);

export default StatsCard;
