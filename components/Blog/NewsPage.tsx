// File: components/NewsPage.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import BlogPost from "./BlogPost";
import styles from "./BlogPage.module.css";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";

interface NewsPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  cloudinaryPublicId?: string;
  imageUrl?: string;
  legacyImage?: string;
}

export default function NewsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortLatest, setSortLatest] = useState(false);
  const [posts, setPosts] = useState<NewsPostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNews() {
      try {
        const res = await fetch("/api/blog-news?type=news");
        if (!res.ok) throw new Error("Failed to fetch news posts");
        setPosts(await res.json());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

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
        {filteredPosts.map((post) => {
          let imgSrc: string;
          if (post.cloudinaryPublicId) {
            imgSrc = getCloudinaryImageUrl(post.cloudinaryPublicId, 400, 250);
          } else if (post.imageUrl) {
            imgSrc = post.imageUrl;
          } else if (post.legacyImage) {
            imgSrc = post.legacyImage.startsWith("http")
              ? post.legacyImage
              : `/images/${post.legacyImage}`;
          } else {
            imgSrc = "/images/placeholder.jpg";
          }

          return (
            <BlogPost
              key={post.slug}
              post={{
                ...post,
                legacyImage: imgSrc,
                link: `/news/${post.slug}`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
