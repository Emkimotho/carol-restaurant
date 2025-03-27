// File: app/admin-dashboard/user-management/page.tsx
"use client";

import React from "react";
import UserCard from "@/components/AdminDashboard/UserCard";
import styles from "@/components/AdminDashboard/UserCard.module.css";


const dummyUsers = [
  { name: "Alice Johnson", role: "Staff" },
  { name: "Bob Smith", role: "Driver" },
  { name: "Charlie Davis", role: "Staff" },
];

const UserManagementPage = () => {
  return (
    <div className={styles.userManagementContainer}>
      <h1>User Management</h1>
      <div className={styles.userGrid}>
        {dummyUsers.map((user, idx) => (
          <UserCard key={idx} name={user.name} role={user.role} />
        ))}
      </div>
    </div>
  );
};

export default UserManagementPage;
