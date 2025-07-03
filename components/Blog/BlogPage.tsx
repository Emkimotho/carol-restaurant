// File: components/BlogPage.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import BlogPost from "./BlogPost";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";
import styles from "./BlogPage.module.css";

interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  cloudinaryPublicId?: string; // new Cloudinary ID
  imageUrl?: string;           // secure URL from Cloudinary
  legacyImage?: string;        // legacy/public URL or filename
  link?: string;
}

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortLatest, setSortLatest] = useState(false);
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/blog-news?type=blog");
        if (!res.ok) throw new Error("Failed to fetch blog posts");
        setPosts(await res.json());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
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

  if (loading) return <div>Loading blog posts...</div>;
  if (!filteredPosts.length) return <div>No blog posts found.</div>;

  return (
    <div className={styles["blog-page"]}>
      <h1 className={styles["blog-page-title"]}>Our Blog</h1>

      <div className={styles["filter-container"]}>
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles["search-input"]}
          aria-label="Search blog topics"
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
          // build thumbnail src: 1) transform Cloudinary ID, 2) stored URL, 3) legacyImage, 4) placeholder
          let thumbSrc: string;
          if (post.cloudinaryPublicId) {
            thumbSrc = getCloudinaryImageUrl(post.cloudinaryPublicId, 300, 200);
          } else if (post.imageUrl) {
            thumbSrc = post.imageUrl;
          } else if (post.legacyImage) {
            thumbSrc = post.legacyImage.startsWith("http")
              ? post.legacyImage
              : `/images/${post.legacyImage}`;
          } else {
            thumbSrc = "/images/placeholder.png";
          }

          return (
            <BlogPost
              key={post.slug}
              post={{
                ...post,
                link: `/blog/${post.slug}`,
                legacyImage: thumbSrc,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
