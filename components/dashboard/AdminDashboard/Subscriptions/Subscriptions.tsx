// File: components/dashboard/AdminDashboard/Subscriptions/Subscriptions.tsx
"use client";

import React, { useEffect, useState } from "react";
import styles from "./Subscriptions.module.css";
import { toast } from "react-toastify";

interface Subscription {
  id: number;
  email: string;
  createdAt: string;
}

const SubscriptionsAdmin: React.FC = () => {
  const [subs, setSubs] = useState<Subscription[]>([]);

  const fetchSubs = async () => {
    try {
      console.log("→ Calling fetch /api/admin/subscriptions");
      const res = await fetch("/api/admin/subscriptions");
      console.log("← Response status:", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("← Non-OK response body:", text);
        throw new Error(`HTTP ${res.status}`);
      }

      const data: Subscription[] = await res.json();
      console.log("← Received data:", data);
      setSubs(data);
    } catch (err) {
      console.error("🔥 Error in fetchSubs():", err);
      toast.error("Could not fetch subscriptions.");
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this subscriber?")) return;
    try {
      console.log(`→ Calling DELETE /api/admin/subscriptions?id=${id}`);
      const res = await fetch(`/api/admin/subscriptions?id=${id}`, {
        method: "DELETE",
      });
      console.log("← DELETE response status:", res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error("← DELETE non-OK body:", text);
        toast.error("Failed to delete.");
        return;
      }

      toast.success("Subscriber removed.");
      fetchSubs();
    } catch (err) {
      console.error("🔥 Error deleting subscriber:", err);
      toast.error("Error deleting subscriber.");
    }
  };

  return (
    <div className={styles.container}>
      <h2>Subscriber List</h2>
      {subs.length === 0 && <p>No subscribers yet.</p>}
      <ul className={styles.list}>
        {subs.map((s) => (
          <li key={s.id} className={styles.item}>
            <span>{s.email}</span>
            <button
              onClick={() => handleDelete(s.id)}
              className="btn btn-secondary"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SubscriptionsAdmin;
