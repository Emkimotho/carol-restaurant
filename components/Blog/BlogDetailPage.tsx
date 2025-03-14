"use client";

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";
import styles from './BlogDetailPage.module.css';

interface BlogPostData {
  id: string | number;
  title: string;
  author: string;
  date: string;
  content: string;
  images: string[];
}

interface BlogDetailPageProps {
  id: string;
}

export default function BlogDetailPage({ id }: BlogDetailPageProps) {
  const [blogPost, setBlogPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Replace with your actual API call if needed.
  useEffect(() => {
    const fetchBlogPost = async () => {
      try {
        // Uncomment and modify the below for your API:
        // const res = await fetch(`/api/blogs/${id}`);
        // const data = await res.json();
        // setBlogPost(data);

        // Mock data for demonstration:
        const data: BlogPostData = {
          id,
          title: 'Exploring the Beauty of Maryland',
          author: 'Admin',
          date: 'October 19, 2023',
          content: `
            <p>Maryland, known as the Old Line State, offers a diverse range of attractions...</p>
            <p>From the bustling streets of Baltimore to the serene shores of the Chesapeake Bay...</p>
            <p>Join us as we delve deeper into what makes Maryland a must-visit destination.</p>
          `,
          images: [
            'https://via.placeholder.com/800x400?text=Maryland+1',
            'https://via.placeholder.com/800x400?text=Maryland+2',
            'https://via.placeholder.com/800x400?text=Maryland+3',
          ],
        };

        setTimeout(() => {
          setBlogPost(data);
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    };

    fetchBlogPost();
  }, [id]);

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error || !blogPost)
    return <div className={styles.error}>Blog post not found or an error occurred.</div>;

  // Prepare images for the gallery
  const galleryImages = blogPost.images.map((img) => ({
    original: img,
    thumbnail: img,
  }));

  return (
    <>
      <Head>
        <title>{blogPost.title} | Company Name</title>
        <meta
          name="description"
          content="Read our latest blog post on exploring the beauty of Maryland."
        />
        {/* Add more meta tags as needed */}
      </Head>
      <article className={styles['blog-detail-page']}>
        <header className={styles['blog-detail-header']}>
          <h1 className={styles['blog-detail-title']}>{blogPost.title}</h1>
          <p className={styles['blog-detail-meta']}>
            By {blogPost.author} | {blogPost.date}
          </p>
        </header>

        <section className={styles['blog-detail-gallery']}>
          <ImageGallery items={galleryImages} showPlayButton={false} />
        </section>

        <section
          className={styles['blog-detail-content']}
          dangerouslySetInnerHTML={{ __html: blogPost.content }}
        ></section>

        {/* Interaction buttons */}
        <div className={styles['blog-interactions']}>
          <button className={styles['interaction-button']} aria-label="Like">
            👍 Like
          </button>
          <button className={styles['interaction-button']} aria-label="Share">
            🔗 Share
          </button>
          <button className={styles['interaction-button']} aria-label="Bookmark">
            📌 Bookmark
          </button>
        </div>

        {/* Comments section */}
        <section className={styles['comments-section']}>
          <h3>Comments</h3>
          <p>Comments feature coming soon!</p>
        </section>
      </article>
    </>
  );
}
