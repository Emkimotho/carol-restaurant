"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./BlogDetailPage.module.css";

/** Data shape returned by /api/blog-news/[slug]?type=news */
interface NewsPostData {
  id: string;
  slug: string;
  title: string;
  author: string;
  date: string;
  content: string;
  image?: string;
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
        const data = await res.json();
        setPost(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!post) return <div className={styles.error}>News post not found.</div>;

  // Same local vs. external logic
  const fallbackImage = "/images/placeholder.jpg";
  let imageSrc = fallbackImage;
  if (post.image) {
    if (post.image.startsWith("http")) {
      imageSrc = post.image;
    } else {
      imageSrc = `/images/${post.image}`;
    }
  }

  return (
    <>
      <Head>
        <title>{post.title} | Company Name</title>
        <meta name="description" content={`Read our news post: ${post.title}`} />
      </Head>

      <article className={styles["blog-detail-page"]}>
        <header className={styles["blog-detail-header"]}>
          <img src={imageSrc} alt={post.title} className={styles["header-image"]} />
          <h1 className={styles["blog-detail-title"]}>{post.title}</h1>
          <p className={styles["blog-detail-meta"]}>
            By {post.author} | {post.date}
          </p>
        </header>

        <section className={styles["blog-detail-content"]}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </section>
      </article>
    </>
  );
}
