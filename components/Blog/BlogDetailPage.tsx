// File: components/BlogDetailPage.tsx
"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";
import styles from "./BlogDetailPage.module.css";

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  author: string;
  date: string;
  content: string;
  cloudinaryPublicId?: string; // new Cloudinary ID
  imageUrl?: string;           // secure URL from Cloudinary
  legacyImage?: string;        // legacy/public URL or filename
}

interface BlogDetailPageProps {
  slug: string;
}

export default function BlogDetailPage({ slug }: BlogDetailPageProps) {
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/blog-news/${slug}?type=blog`);
        if (!res.ok) throw new Error("Failed to fetch blog post");
        setPost(await res.json());
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!post) {
    return <div className={styles.error}>Blog post not found.</div>;
  }

  // Determine image source with fallback chain:
  // 1) Cloudinary via public ID
  // 2) Stored secure URL
  // 3) Legacy image (absolute or local)
  // 4) Placeholder
  let imageSrc = "/images/placeholder.jpg";
  if (post.cloudinaryPublicId) {
    imageSrc = getCloudinaryImageUrl(post.cloudinaryPublicId, 800, 400);
  } else if (post.imageUrl) {
    imageSrc = post.imageUrl;
  } else if (post.legacyImage) {
    imageSrc = post.legacyImage.startsWith("http")
      ? post.legacyImage
      : `/images/${post.legacyImage}`;
  }

  return (
    <>
      <Head>
        <title>{post.title} | Company Name</title>
        <meta
          name="description"
          content={`Read our blog post: ${post.title}`}
        />
      </Head>

      <article className={styles["blog-detail-page"]}>
        <header className={styles["blog-detail-header"]}>
          <Image
            src={imageSrc}
            alt={post.title}
            width={800}
            height={400}
            className={styles["header-image"]}
            unoptimized={!post.cloudinaryPublicId}
          />
          <h1 className={styles["blog-detail-title"]}>{post.title}</h1>
          <p className={styles["blog-detail-meta"]}>
            By {post.author} |{" "}
            {new Date(post.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        <section className={styles["blog-detail-content"]}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content}
          </ReactMarkdown>
        </section>
      </article>
    </>
  );
}
