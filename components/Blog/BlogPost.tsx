// BlogPost.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import styles from './BlogPost.module.css';

interface BlogPostProps {
  post: {
    id: number;
    title: string;
    excerpt: string;
    date: string;
    author: string;
    image: string;
    link: string;
  };
}

export default function BlogPost({ post }: BlogPostProps) {
  return (
    <article className={styles['blog-post']}>
      <img
        src={post.image}
        alt={post.title}
        className={styles['blog-post-image']}
        loading="lazy"
      />
      <div className={styles['blog-post-content']}>
        <h2 className={styles['blog-post-title']}>{post.title}</h2>
        <p className={styles['blog-post-meta']}>
          By {post.author} on {new Date(post.date).toLocaleDateString()}
        </p>
        <p className={styles['blog-post-excerpt']}>{post.excerpt}</p>
        <Link href={post.link} legacyBehavior>
          <a
            className={styles['read-more-button']}
            aria-label={`Read more about ${post.title}`}
          >
            Read More
          </a>
        </Link>
      </div>
    </article>
  );
}
