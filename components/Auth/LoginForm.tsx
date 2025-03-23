// File: 19thhole/components/Auth/LoginForm.tsx
"use client";

/*
  This component renders the login form.
  It expects two callback props:
    - onOpenForgotPassword: called when the user clicks “Forgot Password?”
    - onOpenSignup: called when the user wants to create an account.
  
  This version uses the styles defined in Login.module.css.
*/

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Login.module.css";

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Login failed.");
        return;
      }

      // On successful login, redirect to dashboard
      router.push("/dashboard");
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
