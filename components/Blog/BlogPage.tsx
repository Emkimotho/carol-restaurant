// BlogPage.tsx
"use client";

import React, { useState, useMemo } from 'react';
import BlogPost from './BlogPost';
import styles from './BlogPage.module.css';

interface BlogPostSummary {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  image: string;
  link: string;
}

const allBlogPosts: BlogPostSummary[] = [
  {
    id: 1,
    title: 'Exploring the Flavors of Spring',
    excerpt: 'Join us as we dive into the fresh and vibrant flavors that spring has to offer...',
    date: '2024-04-15',
    author: 'Alice Johnson',
    image: '/img/blog/spring-flavors.jpg',
    link: '/blog/1'
  },
  {
    id: 2,
    title: 'Top 10 Summer Recipes',
    excerpt: 'Beat the heat with these delicious and easy-to-make summer recipes...',
    date: '2024-05-10',
    author: 'Bob Smith',
    image: '/img/blog/summer-recipes.jpg',
    link: '/blog/2'
  },
  {
    id: 3,
    title: 'Autumn Harvest Specials',
    excerpt: 'Celebrate the bounty of autumn with our exclusive harvest specials...',
    date: '2024-09-05',
    author: 'Carol Davis',
    image: '/img/blog/autumn-harvest.jpg',
    link: '/blog/3'
  },
  {
    id: 4,
    title: 'Winter Comfort Foods',
    excerpt: 'Warm up your evenings with these hearty and comforting winter dishes...',
    date: '2024-12-20',
    author: 'David Wilson',
    image: '/img/blog/winter-comfort.jpg',
    link: '/blog/4'
  },
];

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortLatest, setSortLatest] = useState(false);

  const filteredPosts = useMemo(() => {
    let posts = allBlogPosts.filter(
      post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (sortLatest) {
      posts = posts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
    return posts;
  }, [searchTerm, sortLatest]);

  return (
    <div className={styles['blog-page']}>
      <h1 className={styles['blog-page-title']}>Our Blog</h1>
      <div className={styles['filter-container']}>
        <input
          type="text"
          placeholder="Search topics..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles['search-input']}
          aria-label="Search blog topics"
        />
        <label className={styles['sort-label']}>
          <input
            type="checkbox"
            checked={sortLatest}
            onChange={(e) => setSortLatest(e.target.checked)}
          />
          Latest first
        </label>
      </div>
      <div className={styles['blog-posts-container']}>
        {filteredPosts.map((post) => (
          <BlogPost key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
