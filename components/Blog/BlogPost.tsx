// File: components/BlogPost.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";
import styles from "./BlogPost.module.css";

interface BlogPostProps {
  post: {
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
    type?: "blog" | "news";
  };
}

export default function BlogPost({ post }: BlogPostProps) {
  // Determine href
  const href =
    post.link ||
    (post.type === "news" ? `/news/${post.slug}` : `/blog/${post.slug}`);

  // Determine image source with full fallback chain
  const placeholder = "/images/placeholder.jpg";
  let imageSrc: string;

  if (post.cloudinaryPublicId) {
    // 1) Cloudinary transformation URL
    imageSrc = getCloudinaryImageUrl(post.cloudinaryPublicId, 800, 450);
  } else if (post.imageUrl) {
    // 2) Stored secure URL from DB
    imageSrc = post.imageUrl;
  } else if (post.legacyImage) {
    // 3) Legacy/public URL or local filename
    imageSrc = post.legacyImage.startsWith("http")
      ? post.legacyImage
      : `/images/${post.legacyImage}`;
  } else {
    // 4) Fallback placeholder
    imageSrc = placeholder;
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
          unoptimized
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
