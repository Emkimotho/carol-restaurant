// components/dashboard/StatsGrid.tsx
"use client";

import React, { ReactNode } from "react";
import styles from "./StatsGrid.module.css"; // create this CSS-module

interface StatsGridProps {
  children: ReactNode;
}

const StatsGrid: React.FC<StatsGridProps> = ({ children }) => (
  <div className={styles.grid}>{children}</div>
);

export default StatsGrid;
