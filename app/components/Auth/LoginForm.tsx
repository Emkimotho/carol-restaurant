"use client";

import React, { useState } from "react";
import { signIn }          from "next-auth/react";
import { useSearchParams } from "next/navigation";   // ← new
import styles              from "./LoginForm.module.css";

interface LoginFormProps {
  onOpenForgotPassword: () => void;
  onOpenSignup:         () => void;
}

export default function LoginForm({
  onOpenForgotPassword,
  onOpenSignup,
}: LoginFormProps) {
  // ─── local state ────────────────────────────────────────────────
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");

  // ─── grab optional redirect from query string ───────────────────
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("redirect") || "/dashboard";

  // ─── submit handler ─────────────────────────────────────────────
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    /*  Pass our dynamic callbackUrl (so we come right back to checkout
        if that’s where we started), or default to /dashboard.       */
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl,
    });

    // If credentials are wrong, NextAuth keeps us here & returns error string
    if (res && res.error) {
      setError(res.error);
    }
  };

  // ─── JSX ────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleLoginSubmit} className={styles.loginForm}>
      <h2 className={styles.title}>LOGIN</h2>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formGroup}>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
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
}
