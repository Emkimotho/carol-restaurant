"use client";

import React from "react";
import UserCard from "../UserCard";
import styles from "./UserManagement.module.css";

// Dummy data for demonstration purposes
const dummyUsers = [
  { name: "Alice Johnson", role: "Staff" },
  { name: "Bob Smith", role: "Driver" },
  { name: "Charlie Davis", role: "Staff" },
];

const UserManagement: React.FC = () => {
  return (
    <div className={styles.userManagementContainer}>
      <h1 className={styles.title}>User Management</h1>
      <div className={styles.userGrid}>
        {dummyUsers.map((user, index) => (
          <UserCard key={index} name={user.name} role={user.role} />
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
