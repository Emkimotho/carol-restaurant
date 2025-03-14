// NewsPage.tsx
"use client";

import React from 'react';
import BlogPost from './BlogPost';
import styles from './BlogPage.module.css';

const newsPosts = [
  {
    id: 101,
    title: 'Restaurant Opens New Downtown Location',
    excerpt: 'We are excited to announce the opening of our new restaurant location...',
    date: '2024-05-20',
    author: 'Food Desk',
    image: '/img/news/new-location.jpg',
    link: '/news/101'
  },
  {
    id: 102,
    title: 'Seasonal Menu Update Now Live',
    excerpt: 'Check out the new seasonal menu featuring locally sourced ingredients...',
    date: '2024-06-01',
    author: 'Chef Reporter',
    image: '/img/news/seasonal-menu.jpg',
    link: '/news/102'
  },
  // Additional news items can be added here.
];

export default function NewsPage() {
  return (
    <div className={styles['blog-page']}>
      <h1 className={styles['blog-page-title']}>Latest News</h1>
      <div className={styles['blog-posts-container']}>
        {newsPosts.map((post) => (
          <BlogPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
