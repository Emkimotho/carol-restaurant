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
    image?: string;               // legacy/public URL or filename
    cloudinaryPublicId?: string;  // optional Cloudinary public ID
    link?: string;
    type?: "blog" | "news";
  };
}

export default function BlogPost({ post }: BlogPostProps) {
  // Determine href
  const href =
    post.link ||
    (post.type === "news" ? `/news/${post.slug}` : `/blog/${post.slug}`);

  // Determine image source
  const placeholder = "/images/placeholder.jpg";
  let imageSrc = placeholder;

  if (post.cloudinaryPublicId) {
    imageSrc = getCloudinaryImageUrl(post.cloudinaryPublicId, 800, 450);
  } else if (post.image) {
    imageSrc = post.image.startsWith("http")
      ? post.image
      : `/images/${post.image}`;
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
