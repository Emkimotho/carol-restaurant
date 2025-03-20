"use client";

import React, { useState, useEffect } from "react";
import styles from "./Preloader.module.css";

/**
 * A simple preloader that shows a centered spinner.
 * Automatically hides after 2 seconds by default.
 */
export default function Preloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Hide after 2 seconds
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) {
    // If not loading, unmount the preloader
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.spinner}></div>
    </div>
  );
}
