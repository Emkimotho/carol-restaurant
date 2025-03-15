"use client";

import React, { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import styles from "./Login.module.css";

interface LoginFormProps {
  onOpenForgotPassword: () => void;
  onOpenSignup: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onOpenForgotPassword,
  onOpenSignup,
}) => {
  const router = useRouter();
  const { login } = useContext(AuthContext);
  const backendURL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/auth";

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 6;

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError("");

    if (!validateEmail(loginEmail) || !validatePassword(loginPassword)) {
      setLoginError("Please enter valid credentials.");
      return;
    }

    try {
      const response = await fetch(`${backendURL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        // Pass the user object only—remove token property because it's not expected by AuthContext.
        login(data.user);
        router.push("/dashboard");
      } else {
        setLoginError(data.message || "Invalid email or password.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Network error. Please try again later.");
    }
  };

  return (
    <form className={styles["login-form"]} onSubmit={handleLoginSubmit}>
      <h3>Login</h3>
      {loginError && <p className={styles["error-message"]}>{loginError}</p>}
      <div className={styles["form-group"]}>
        <label htmlFor="login-email">Email Address</label>
        <input
          type="email"
          id="login-email"
          placeholder="Enter your email"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          required
        />
      </div>
      <div className={styles["form-group"]}>
        <label htmlFor="login-password">Password</label>
        <input
          type="password"
          id="login-password"
          placeholder="Enter your password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          required
        />
      </div>
      <div className={styles["form-actions"]}>
        <button type="submit" className={styles["btn-primary"]}>
          Login
        </button>
        <button
          type="button"
          className={styles["forgot-password"]}
          onClick={onOpenForgotPassword}
        >
          Forgot Password?
        </button>
      </div>
      <div className={styles["switch-auth"]}>
        <p>
          Don&apos;t have an account?{" "}
          <button
            type="button"
            className={styles["signup-link"]}
            onClick={onOpenSignup}
          >
            Sign Up
          </button>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;
