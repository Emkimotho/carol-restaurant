// BlogTabs.tsx
"use client";

import React, { useState } from 'react';
import BlogPage from './BlogPage';
import NewsPage from './NewsPage';
import styles from './BlogTabs.module.css';

export default function BlogTabs() {
  const [activeTab, setActiveTab] = useState<'blog' | 'news'>('blog');

  return (
    <div className={styles.tabsContainer}>
      <nav className={styles.tabNav}>
        <button
          className={`${styles.tabButton} ${activeTab === 'blog' ? styles.active : ''}`}
          onClick={() => setActiveTab('blog')}
        >
          Blog
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'news' ? styles.active : ''}`}
          onClick={() => setActiveTab('news')}
        >
          News
        </button>
      </nav>
      <div className={styles.tabContent}>
        {activeTab === 'blog' ? <BlogPage /> : <NewsPage />}
      </div>
    </div>
  );
}
