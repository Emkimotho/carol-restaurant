"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminBlogNewsForm from "@/components/dashboard/AdminDashboard/BlogNews/AdminBlogNewsForm";
import { Post } from "@/components/dashboard/AdminDashboard/BlogNews/AdminBlogNewsList";

interface ExtendedPost extends Post {
  excerpt: string;
  content: string;
  image: string;
}

export default function EditBlogNewsPage() {
  const { slug } = useParams() as { slug: string };
  const [post, setPost] = useState<ExtendedPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        // GET a single post by slug
        const res = await fetch(`/api/blog-news/${slug}`);
        if (!res.ok) throw new Error("Error fetching post");
        const data = await res.json();
        setPost(data);
      } catch (error) {
        console.error(error);
        alert("Error fetching post");
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [slug]);

  if (loading) return <p>Loading post...</p>;
  if (!post) return <p>Post not found</p>;

  return (
    <div style={{ padding: "20px" }}>
      <AdminBlogNewsForm initialData={post} />
    </div>
  );
}
