"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import BlogPage from "./BlogPage";
import NewsPage from "./NewsPage";
import styles from "./BlogTabs.module.css";

interface BlogTabsProps {
  defaultTab?: "blog" | "news";
}

export default function BlogTabs({ defaultTab = "blog" }: BlogTabsProps) {
  const [activeTab, setActiveTab] = useState<"blog" | "news">(defaultTab);
  const router = useRouter();
  const pathName = usePathname();

  // Keep the tab state in sync with the current route
  useEffect(() => {
    if (pathName === "/news") {
      setActiveTab("news");
    } else {
      // If pathName is /blog (or anything else), default to "blog"
      setActiveTab("blog");
    }
  }, [pathName]);

  // Handle tab switching by pushing the route
  function handleTabClick(tab: "blog" | "news") {
    if (tab === "news") {
      router.push("/news");
    } else {
      router.push("/blog");
    }
  }

  return (
    <div className={styles.tabsContainer}>
      <nav className={styles.tabNav}>
        <button
          className={`${styles.tabButton} ${activeTab === "blog" ? styles.active : ""}`}
          onClick={() => handleTabClick("blog")}
        >
          Blog
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "news" ? styles.active : ""}`}
          onClick={() => handleTabClick("news")}
        >
          News
        </button>
      </nav>

      <div className={styles.tabContent}>
        {/* Conditionally render either the BlogPage or NewsPage content */}
        {activeTab === "blog" ? <BlogPage /> : <NewsPage />}
      </div>
    </div>
  );
}
