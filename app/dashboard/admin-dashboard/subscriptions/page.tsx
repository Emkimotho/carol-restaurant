// File: app/dashboard/admin/subscriptions/page.tsx
import React from "react";
import SubscriptionsAdmin from "@/components/dashboard/AdminDashboard/Subscriptions/Subscriptions";
import EmailComposer from "@/components/dashboard/AdminDashboard/Subscriptions/EmailComposer";

export default function AdminSubscriptionsPage() {
  return (
    <div className="dashboard-layout" style={{ display: "flex", gap: "2rem" }}>
      <div style={{ flex: 1 }}>
        <SubscriptionsAdmin />
      </div>
      <div style={{ flex: 1 }}>
        <EmailComposer />
      </div>
    </div>
  );
}
