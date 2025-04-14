"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./AdminBlogNews.module.css";

export interface Post {
  id: string;         // from DB
  slug: string;       // we’ll use this to edit/delete
  title: string;
  excerpt: string;
  author: string;
  date: string;
  type: "blog" | "news";
}

export default function AdminBlogNewsList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch posts from the API (GET /api/blog-news => returns all)
  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/blog-news"); // no type => all
        if (!res.ok) throw new Error("Failed to fetch posts");
        const data = await res.json();
        setPosts(data);
      } catch (error) {
        console.error(error);
        alert("Error loading posts");
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  async function handleDelete(slug: string) {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        const res = await fetch(`/api/blog-news/${slug}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error deleting post");
        // On success, remove from local list
        setPosts((prev) => prev.filter((post) => post.slug !== slug));
      } catch (error) {
        console.error(error);
        alert("Error deleting post");
      }
    }
  }

  if (loading) return <p>Loading posts...</p>;

  return (
    <div className={styles.container}>
      <h2>Blog & News Posts</h2>

      <Link href="/dashboard/admin-dashboard/blog-news/new">
        <button className={styles.newButton}>Create New Post</button>
      </Link>

      <table className={styles.postTable}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Date</th>
            <th>Author</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.slug}>
              <td>{post.title}</td>
              <td>{post.type}</td>
              <td>{new Date(post.date).toLocaleDateString()}</td>
              <td>{post.author}</td>
              <td>
                <Link href={`/dashboard/admin-dashboard/blog-news/${post.slug}`}>
                  <button className={styles.editButton}>Edit</button>
                </Link>
                <button
                  onClick={() => handleDelete(post.slug)}
                  className={styles.deleteButton}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
