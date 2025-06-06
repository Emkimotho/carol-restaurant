// File: 19thhole/app/components/Auth/ForgotPasswordModal.tsx
"use client";

/*
  This component renders the modal for "Forgot Password" functionality.
  It uses a relative URL for the backend and expects:
    - isOpen: whether the modal is visible.
    - onClose: callback to close the modal.
    - backendURL: the base URL for API calls.
  
  Adjust the CSS module path as needed. In this example, it reuses styles from Login.module.css.
*/

import React, { useState } from "react";
import styles from "./ForgotPasswordModal.module.css";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendURL: string;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  backendURL,
}) => {
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleForgotPasswordSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setForgotPasswordMessage("");
    setForgotPasswordError("");

    if (!validateEmail(forgotPasswordEmail)) {
      setForgotPasswordError("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch(`${backendURL}/password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordEmail }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordMessage(
          "If this email exists, a password reset link has been sent."
        );
        setForgotPasswordEmail("");
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setForgotPasswordError(
          data.message || "Something went wrong. Please try again."
        );
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setForgotPasswordError("Network error. Please try again later.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles["modal-overlay"]} aria-modal="true">
      <div
        className={styles["modal-content"]}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles["close-button"]}
          onClick={onClose}
          aria-label="Close Forgot Password Modal"
        >
          &times;
        </button>
        <h3>Forgot Password</h3>
        {forgotPasswordError && (
          <p className={styles["error-message"]}>{forgotPasswordError}</p>
        )}
        {forgotPasswordMessage && (
          <p className={styles["success-message"]}>{forgotPasswordMessage}</p>
        )}
        <form onSubmit={handleForgotPasswordSubmit}>
          <div className={styles["form-group"]}>
            <label htmlFor="forgot-password-email">Email Address</label>
            <input
              type="email"
              id="forgot-password-email"
              placeholder="Enter your registered email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={styles["btn-primary"]}>
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
