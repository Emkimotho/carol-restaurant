// File: app/admin-dashboard/menu-builder/page.tsx
"use client";

import React from "react";
import MenuBuilder from "@/components/AdminDashboard/MenuBuilder/MenuBuilder";

const AdminMenuBuilderPage: React.FC = () => {
  return (
    <div>
      <h1>Admin Menu Builder Dashboard</h1>
      <MenuBuilder />
    </div>
  );
};

export default AdminMenuBuilderPage;
