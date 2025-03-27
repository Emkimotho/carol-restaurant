// File: components/AdminDashboard/UserCard.tsx
"use client";

import React from "react";
import styles from "./UserCard.module.css";

interface UserCardProps {
  name: string;
  role: string;
}

const UserCard: React.FC<UserCardProps> = ({ name, role }) => {
  return (
    <div className={styles.userCard}>
      <h4 className={styles.userName}>{name}</h4>
      <p className={styles.userRole}>{role}</p>
    </div>
  );
};

export default UserCard;
