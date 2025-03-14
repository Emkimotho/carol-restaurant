"use client";

import React, { useState, useEffect } from "react";
import LoginForm from "@/components/Auth/LoginForm";
import SignupModal from "@/components/Auth/SignupModal";
import ForgotPasswordModal from "@/components/Auth/ForgotPasswordModal";
import styles from "./Login.module.css";

const backendURL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api/auth";

const Login: React.FC = () => {
  // Track mounting status to delay rendering until after hydration.
  const [hasMounted, setHasMounted] = useState(false);

  // State for modal visibility.
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Listen for Escape key to close any open modals.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSignUpOpen) setIsSignUpOpen(false);
        if (isForgotPasswordOpen) setIsForgotPasswordOpen(false);
      }
    };

    if (isSignUpOpen || isForgotPasswordOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isSignUpOpen, isForgotPasswordOpen]);

  // Don't render until after the component has mounted to avoid SSR/client mismatches.
  if (!hasMounted) {
    return null;
  }

  return (
    <div className={styles["auth-container"]}>
      <div className={styles["auth-left"]}>
        <h2>Welcome Back!</h2>
        <p>Enter your credentials to access your account.</p>
      </div>
      <div className={styles["auth-right"]}>
        <LoginForm
          onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
          onOpenSignup={() => setIsSignUpOpen(true)}
        />
      </div>
      <SignupModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        backendURL={backendURL}
      />
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        backendURL={backendURL}
      />
    </div>
  );
};

export default Login;
