// File: app/components/Auth/LoginForm.tsx
"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./LoginForm.module.css";

interface LoginFormProps {
  onOpenForgotPassword: () => void;
  onOpenSignup: () => void;
}

export default function LoginForm({
  onOpenForgotPassword,
  onOpenSignup,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("redirect") || "/dashboard";

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });

    if (!res) {
      setError("Unexpected error. Please try again.");
    } else if (res.error) {
      setError(res.error);
    } else {
      router.push(callbackUrl);
    }
  };

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
