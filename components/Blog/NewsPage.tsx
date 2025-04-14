"use client";

import React, { useState, useEffect, useMemo } from "react";
import BlogPost from "./BlogPost";
import styles from "./BlogPage.module.css";

interface NewsPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  image: string;
  link?: string;
}

export default function NewsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortLatest, setSortLatest] = useState(false);
  const [posts, setPosts] = useState<NewsPostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        // Fetch from your Next.js API with type=news
        const res = await fetch("/api/blog-news?type=news");
        if (!res.ok) throw new Error("Failed to fetch news posts");
        const data = await res.json();
        setPosts(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  // Filter + optional sort
  const filteredPosts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    let filtered = posts.filter(
      (post) =>
        post.title.toLowerCase().includes(term) ||
        post.excerpt.toLowerCase().includes(term)
    );
    if (sortLatest) {
      filtered.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
    return filtered;
  }, [posts, searchTerm, sortLatest]);

  if (loading) return <div>Loading news posts...</div>;
  if (!filteredPosts.length) return <div>No news posts found.</div>;

  return (
    <div className={styles["blog-page"]}>
      <h1 className={styles["blog-page-title"]}>Latest News</h1>

      <div className={styles["filter-container"]}>
        <input
          type="text"
          placeholder="Search news..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles["search-input"]}
          aria-label="Search news"
        />

        <label className={styles["sort-label"]}>
          <input
            type="checkbox"
            checked={sortLatest}
            onChange={(e) => setSortLatest(e.target.checked)}
          />
          Latest first
        </label>
      </div>

      <div className={styles["blog-posts-container"]}>
        {filteredPosts.map((post) => (
          <BlogPost
            key={post.slug}
            post={{
              ...post,
              // If you want forced /news route:
              link: `/news/${post.slug}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
