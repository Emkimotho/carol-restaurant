// File: app/dashboard/admin-dashboard/register-user/page.tsx
"use client";

import React from "react";
import RegisterUserForm from "@/components/dashboard/AdminDashboard/RegisterUser/RegisterUser";
import styles from "./RegisterUserPage.module.css";

export default function RegisterUserPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Register User</h1>
      <RegisterUserForm />
    </div>
  );
}
