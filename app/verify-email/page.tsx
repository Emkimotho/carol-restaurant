// File: 19thhole/app/verify-email/page.tsx
"use client";

/*
  This page verifies the user's email.
  It reads the token from the query string, calls the API endpoint at /api/auth/verify-email,
  displays feedback messages, and auto-redirects to the login page on success.
*/

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./VerifyEmail.module.css";

const VerifyEmailPage: React.FC = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(""); // "success" or "error"
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setMessage("Verification token is missing.");
      setStatus("error");
      setIsLoading(false);
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setMessage(data.message || "Email verified successfully! Redirecting...");
          setStatus("success");
          setTimeout(() => {
            router.push("/login");
          }, 5000);
        } else {
          setMessage(data.message || "Email verification failed. Please try again.");
          setStatus("error");
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setMessage("A network error occurred. Please try again later.");
        setStatus("error");
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className={styles.container}>
      {isLoading ? (
        <div className={styles.loadingSpinner}>Verifying...</div>
      ) : (
        <div className={`${styles.feedbackMessage} ${styles[status]}`}>
          {message}
        </div>
      )}

      {!isLoading && status === "success" && (
        <div className={styles.redirectMessage}>
          Redirecting to <a href="/login">Login</a>...
        </div>
      )}

      {!isLoading && status === "error" && (
        <div className={styles.redirectMessage}>
          <p>If the issue persists, please contact support.</p>
          <p>
            <a href="/resend-verification">Resend Verification Email</a>
          </p>
        </div>
      )}
    </div>
  );
};

export default VerifyEmailPage;
