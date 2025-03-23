// File: 19thhole/app/verify-notice/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./VerifyNotice.module.css";

const VerifyNoticePage: React.FC = () => {
  const router = useRouter();

  // Auto-redirect to login after 7 seconds.
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 7000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.noticeCard}>
        <h1 className={styles.header}>Sign Up Successful!</h1>
        <p className={styles.message}>
          Thank you for signing up. Please check your email for a verification link.
        </p>
        <p className={styles.message}>
          You will not be able to log in until you verify your email.
        </p>
        <p className={styles.redirect}>
          Redirecting to <a className={styles.link} href="/login">Login</a> in a few seconds...
        </p>
      </div>
    </div>
  );
};

export default VerifyNoticePage;
