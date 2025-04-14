"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./BlogPost.module.css";

interface BlogPostProps {
  post: {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    author: string;
    image?: string;
    link?: string;
    type?: "blog" | "news";
  };
}

export default function BlogPost({ post }: BlogPostProps) {
  // Decide the link
  let href = post.link;
  if (!href) {
    href = post.type === "news"
      ? `/news/${post.slug}`
      : `/blog/${post.slug}`;
  }

  // Build a valid image path or URL
  const fallbackImage = "/images/placeholder.jpg";
  let imageSrc = fallbackImage;
  if (post.image) {
    if (post.image.startsWith("http")) {
      imageSrc = post.image;
    } else {
      imageSrc = `/images/${post.image}`;
    }
  }

  // Format date
  const formattedDate = new Date(post.date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className={styles["blog-post"]}>
      <div className={styles["blog-post-imageWrapper"]}>
        <Image
          src={imageSrc}
          alt={post.title}
          width={800}
          height={450}
          className={styles["blog-post-image"]}
          loading="lazy"
        />
      </div>

      <div className={styles["blog-post-content"]}>
        <h2 className={styles["blog-post-title"]}>{post.title}</h2>
        <p className={styles["blog-post-meta"]}>
          By {post.author} on {formattedDate}
        </p>
        <p className={styles["blog-post-excerpt"]}>{post.excerpt}</p>

        <Link
          href={href}
          className={styles["read-more-button"]}
          aria-label={`Read more about ${post.title}`}
        >
          Read More
        </Link>
      </div>
    </article>
  );
}
