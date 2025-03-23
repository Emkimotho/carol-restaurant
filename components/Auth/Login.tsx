// File: 19thhole/components/Auth/Login.tsx
"use client";

/*
  This component renders the login page.
  It displays a login form along with Signup and Forgot Password modals.
  The backend API URL is defined as a relative URL so that in development
  (port 3000) the API calls are made on the same domain.
*/

import React, { useState, useEffect } from "react";
import LoginForm from "./LoginForm";
import SignupModal from "./SignupModal";
import ForgotPasswordModal from "./ForgotPasswordModal";
import styles from "./Login.module.css";

// Use a relative URL for the backend API.
// In development, this defaults to "/api/auth"
const backendURL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/auth";

const Login: React.FC = () => {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Close modals when Escape key is pressed and disable body scrolling if any modal is open.
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

  return (
    <div className={styles["auth-container"]}>
      <div className={styles["auth-left"]}>
        <h2>Welcome Back!</h2>
        <p>
          To stay connected, log in with your personal info or create an account.
        </p>
      </div>
      <div className={styles["auth-right"]}>
        {/* Extra wrapper for improved spacing */}
        <div className={styles["form-container"]}>
          <LoginForm
            onOpenForgotPassword={() => setIsForgotPasswordOpen(true)}
            onOpenSignup={() => setIsSignUpOpen(true)}
          />
        </div>
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
