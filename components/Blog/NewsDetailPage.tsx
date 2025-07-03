// File: components/NewsDetailPage.tsx
"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";
import styles from "./BlogDetailPage.module.css";

interface NewsPostData {
  id: string;
  slug: string;
  title: string;
  author: string;
  date: string;
  content: string;
  cloudinaryPublicId?: string; // new Cloudinary ID
  imageUrl?: string;           // secure URL from Cloudinary stored in DB
  legacyImage?: string;        // legacy/public URL
}

interface NewsDetailPageProps {
  slug: string;
}

export default function NewsDetailPage({ slug }: NewsDetailPageProps) {
  const [post, setPost] = useState<NewsPostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/blog-news/${slug}?type=news`);
        if (!res.ok) throw new Error("Failed to fetch news post");
        setPost(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!post)  return <div className={styles.error}>News post not found.</div>;

  // Determine image src: 1) Cloudinary via public ID, 2) stored imageUrl, 3) legacyImage, 4) placeholder
  let src: string;
  if (post.cloudinaryPublicId) {
    src = getCloudinaryImageUrl(post.cloudinaryPublicId, 800, 400);
  } else if (post.imageUrl) {
    src = post.imageUrl;
  } else if (post.legacyImage) {
    src = post.legacyImage.startsWith("http")
      ? post.legacyImage
      : `/images/${post.legacyImage}`;
  } else {
    src = "/images/placeholder.jpg";
  }

  return (
    <>
      <Head>
        <title>{post.title} | Company Name</title>
        <meta
          name="description"
          content={`Read our news post: ${post.title}`}
        />
      </Head>

      <article className={styles["blog-detail-page"]}>
        <header className={styles["blog-detail-header"]}>
          <Image
            src={src}
            alt={post.title}
            width={800}
            height={400}
            className={styles["header-image"]}
            unoptimized
          />
          <h1 className={styles["blog-detail-title"]}>{post.title}</h1>
          <p className={styles["blog-detail-meta"]}>
            By {post.author} | {post.date}
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
