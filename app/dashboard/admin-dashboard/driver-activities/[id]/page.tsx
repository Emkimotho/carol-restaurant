// File: app/dashboard/admin-dashboard/driver-activities/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./DriverActivities.module.css";

interface Delivery {
  orderId: string;
  status: string;
  totalAmount: number;
  updatedAt: string;
}

export default function DriverActivitiesPage() {
  const { id } = useParams();                      // driver id
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    fetch(`/api/drivers/${id}/deliveries`)
      .then((res) => res.json())
      .then((data) => setDeliveries(data.deliveries));
  }, [id]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Driver {id} Deliveries</h2>
      <table className="w-full table-auto">
        <thead>
          <tr>
            {["Order ID","Amount","Status","Last Updated"].map(h => (
              <th key={h} className="px-2 py-1 text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <tr key={d.orderId} className="border-t">
              <td className="px-2 py-1">{d.orderId}</td>
              <td className="px-2 py-1">${d.totalAmount.toFixed(2)}</td>
              <td className="px-2 py-1">{d.status}</td>
              <td className="px-2 py-1">{new Date(d.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
