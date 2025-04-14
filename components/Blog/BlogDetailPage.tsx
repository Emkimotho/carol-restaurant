"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./BlogDetailPage.module.css";

/** Data shape returned by /api/blog-news/[slug]?type=blog */
interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  author: string;
  date: string;
  content: string;
  image?: string;
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
  if (!post) return <div className={styles.error}>Blog post not found.</div>;

  // Ensure the same image logic:
  // If DB image is a local file, prepend /images/; else if starts with http, use as-is.
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
        <meta name="description" content={`Read our blog post: ${post.title}`} />
      </Head>

      <article className={styles["blog-detail-page"]}>
        <header className={styles["blog-detail-header"]}>
          <Image
            src={imageSrc}
            alt={post.title}
            width={800} // Adjust width as needed
            height={400} // Adjust height as needed
            className={styles["header-image"]}
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
