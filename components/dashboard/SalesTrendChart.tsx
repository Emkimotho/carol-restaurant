// components/dashboard/SalesTrendChart.tsx
"use client";

import React from "react";
import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { fetcher } from "@/lib/fetcher";
import styles from "./SalesTrendChart.module.css"; // create this CSS-module

interface DataPoint {
  date: string;
  sales: number;
}

const SalesTrendChart: React.FC = () => {
  const { data, error } = useSWR<DataPoint[]>(
    "/api/dashboard/sales/trend",
    fetcher
  );

  if (error) return <div className={styles.error}>Chart failed to load.</div>;
  if (!data) return <div className={styles.loading}>Loading chart…</div>;

  return (
    <div className={styles.container}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={(d) =>
              new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
            }
          />
          <YAxis />
          <Tooltip
            labelFormatter={(l) =>
              new Date(l).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            }
          />
          <Line type="monotone" dataKey="sales" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesTrendChart;
