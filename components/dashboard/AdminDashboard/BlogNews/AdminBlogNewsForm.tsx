"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import styles from "./AdminBlogNews.module.css";
import { Post } from "./AdminBlogNewsList";

interface AdminBlogNewsFormProps {
  initialData?: Post & {
    excerpt: string;
    content: string;
    // store the current image path/filename
    image?: string;
  };
}

export default function AdminBlogNewsForm({ initialData }: AdminBlogNewsFormProps) {
  // Basic post fields state
  const [title, setTitle] = useState(initialData?.title || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [author, setAuthor] = useState(initialData?.author || "");
  const [date, setDate] = useState(initialData?.date.slice(0, 10) || "");
  const [type, setType] = useState<"blog" | "news">(initialData?.type || "blog");

  // For header image upload
  const [imageFile, setImageFile] = useState<File | null>(null);

  const router = useRouter();

  // Handle header image file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Build FormData with all fields and the header image file
    const formData = new FormData();
    formData.append("title", title);
    formData.append("excerpt", excerpt);
    formData.append("content", content);
    formData.append("author", author);
    formData.append("date", date);
    formData.append("type", type);

    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      let res;
      // If editing (initialData is present), do PUT
      if (initialData) {
        // We rely on slug from initialData
        const slug = initialData.slug;
        res = await fetch(`/api/blog-news/${slug}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        // else do POST (creating new)
        res = await fetch("/api/blog-news", {
          method: "POST",
          body: formData,
        });
      }

      if (res.ok) {
        toast.success("Post saved successfully!");
        router.push("/dashboard/admin-dashboard/blog-news");
      } else {
        const errorData = await res.json();
        toast.error(`Error saving post: ${errorData.message || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Error saving post:", error);
      toast.error(`Error saving post: ${error.message}`);
    }
  }

  return (
    <div className={styles.formContainer}>
      <h2>{initialData ? "Edit Post" : "Create New Post"}</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label>
          Title:
          <input
            type="text"
            placeholder="Enter the post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <small>Provide a concise and descriptive title.</small>
        </label>

        <label>
          Excerpt:
          <textarea
            placeholder="Enter a short excerpt of the post"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            required
          />
          <small>This excerpt will appear in post summaries.</small>
        </label>

        <label>
          Content:
          <textarea
            placeholder="Write your post content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={10}
          />
          <small>Write the full content of your post.</small>
        </label>

        <label>
          Author:
          <input
            type="text"
            placeholder="Enter the author name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />
          <small>Who is writing this post?</small>
        </label>

        <label>
          Date:
          <input
            type="date"
            placeholder="Select the publication date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <small>Select the date of publication.</small>
        </label>

        <label>
          Upload Header Image:
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <small>
            Choose a header image file from your computer. (Accepted formats: JPG, PNG, etc.)
          </small>
        </label>

        <label>
          Type:
          <select value={type} onChange={(e) => setType(e.target.value as "blog" | "news")}>
            <option value="blog">Blog</option>
            <option value="news">News</option>
          </select>
          <small>Select whether this post is a blog or a news article.</small>
        </label>

        <button type="submit" className={styles.submitButton}>
          {initialData ? "Update Post" : "Create Post"}
        </button>
      </form>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
