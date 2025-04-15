"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
// Update the import to use the new CSS module
import styles from "./LoginForm.module.css";

interface LoginFormProps {
  onOpenForgotPassword: () => void;
  onOpenSignup: () => void;
}

const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/auth";

const LoginForm: React.FC<LoginFormProps> = ({
  onOpenForgotPassword,
  onOpenSignup,
}) => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${backendURL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Login failed.");
        return;
      }

      // Get user data from the response
      const data = await res.json();

      // Role-based redirection logic
      if (data.user && data.user.roles) {
        const roles: string[] = data.user.roles;
        if (roles.includes("ADMIN") || roles.includes("SUPERADMIN")) {
          router.push("/dashboard/admin-dashboard");
        } else if (roles.includes("STAFF")) {
          router.push("/dashboard/staff-dashboard");
        } else if (roles.includes("DRIVER")) {
          router.push("/dashboard/driver-dashboard");
        } else if (roles.includes("CUSTOMER")) {
          router.push("/dashboard/customer-dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        // Fallback in case no user data is returned
        setError("Invalid login response.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again later.");
    }
  };

  return (
    <form onSubmit={handleLoginSubmit} className={styles.loginForm}>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.formGroup}>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className={styles.formGroup}>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className={styles.submitButton}>
        Login
      </button>
      <div className={styles.links}>
        <button
          type="button"
          onClick={onOpenForgotPassword}
          className={styles.linkButton}
        >
          Forgot Password?
        </button>
        <button
          type="button"
          onClick={onOpenSignup}
          className={styles.linkButton}
        >
          Sign Up
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
