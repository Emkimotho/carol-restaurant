// File: components/dashboard/AdminDashboard/AdminBlogNewsForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";
import styles from "./AdminBlogNews.module.css";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";
import type { Post } from "./AdminBlogNewsList";

interface AdminBlogNewsFormProps {
  initialData?: Post & {
    excerpt: string;
    content: string;
    image?: string;              // legacy URL
    cloudinaryPublicId?: string; // new Cloudinary ID
  };
}

export default function AdminBlogNewsForm({ initialData }: AdminBlogNewsFormProps) {
  const router = useRouter();

  // Basic post fields
  const [title, setTitle]     = useState(initialData?.title     || "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt   || "");
  const [content, setContent] = useState(initialData?.content   || "");
  const [author, setAuthor]   = useState(initialData?.author    || "");
  const [date, setDate]       = useState(initialData?.date.slice(0, 10) || "");
  const [type, setType]       = useState<"blog"|"news">(initialData?.type || "blog");

  // Image states
  const [imageFile, setImageFile]           = useState<File | null>(null);
  const [previewUrl, setPreviewUrl]         = useState<string>("");
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  // track legacyImage value to send if no new upload
  const [legacyImage, setLegacyImage]       = useState<string | null>(initialData?.image || null);

  // Build existing-image preview URL
  useEffect(() => {
    if (initialData?.cloudinaryPublicId) {
      setExistingImageUrl(
        getCloudinaryImageUrl(initialData.cloudinaryPublicId, 800, 200)
      );
    } else if (initialData?.image) {
      setExistingImageUrl(initialData.image);
    }
  }, [initialData]);

  // Preview new file selection
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      // if selecting a new file, clear legacyImage so API won't use it
      setLegacyImage(null);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const formData = new FormData();
    formData.append("title",   title);
    formData.append("excerpt", excerpt);
    formData.append("content", content);
    formData.append("author",  author);
    formData.append("date",    date);
    formData.append("type",    type);

    // If a new file was selected, include it
    if (imageFile) {
      formData.append("image", imageFile);
    } else if (legacyImage) {
      // Otherwise, pass along the existing legacy URL
      formData.append("legacyImage", legacyImage);
    }

    try {
      let res: Response;
      if (initialData) {
        res = await fetch(`/api/blog-news/${initialData.slug}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        res = await fetch("/api/blog-news", {
          method: "POST",
          body: formData,
        });
      }

      const result = await res.json();
      if (res.ok) {
        toast.success("Post saved successfully!");
        router.push("/dashboard/admin-dashboard/blog-news");
      } else {
        toast.error(`Error saving post: ${result.message || "Unknown error"}`);
      }
    } catch (err: any) {
      console.error("Error saving post:", err);
      toast.error(`Error saving post: ${err.message}`);
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
            Choose a header image file. If you don’t select one, the existing image will be preserved.
          </small>
        </label>

        {/* Preview area */}
        {(previewUrl || existingImageUrl) && (
          <div className={styles.previewWrapper}>
            <Image
              src={previewUrl || existingImageUrl!}
              alt="Header preview"
              width={800}
              height={200}
              style={{ objectFit: "cover", borderRadius: "0.5rem" }}
              unoptimized
            />
          </div>
        )}

        <label>
          Type:
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
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
