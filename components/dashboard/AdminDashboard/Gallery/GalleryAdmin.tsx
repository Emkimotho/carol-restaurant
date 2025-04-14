"use client";

import React, { useState, useEffect, FormEvent } from "react";
import Image from "next/image";
import styles from "./GalleryAdmin.module.css";
import { toast } from "react-toastify";

interface GalleryImage {
  id: number;
  src: string;
  alt: string;
  title: string;
  description: string;
}

const GalleryAdmin: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchImages = async () => {
    try {
      const res = await fetch("/api/gallery");
      if (!res.ok) throw new Error("Failed to fetch images");
      const data = await res.json();
      setImages(data);
    } catch (error) {
      console.error("Error fetching images:", error);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select an image file to upload.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "alt",
      alt || "Enter key words here separated by commas for better Google search"
    );
    formData.append("title", title);
    formData.append("description", description);

    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast.success("Image uploaded successfully!");
        setFile(null);
        setAlt("");
        setTitle("");
        setDescription("");
        fetchImages();
      } else {
        toast.error("Failed to upload image.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during upload.");
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/gallery?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Image deleted successfully!");
        fetchImages();
      } else {
        toast.error("Failed to delete image.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during deletion.");
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Gallery Admin Dashboard</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div>
          <label>Upload Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
              }
            }}
            required
          />
        </div>
        <div>
          <label>Alt Text:</label>
          <input
            type="text"
            value={alt}
            placeholder="Enter key words here separated by commas for better Google search"
            onChange={(e) => setAlt(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload Image"}
        </button>
      </form>
      <div className={styles.imageList}>
        {images.map((img) => (
          <div key={img.id} className={styles.imageItem}>
            <Image
              src={img.src}
              alt={img.alt}
              width={300}
              height={200}
              className={styles.galleryImage}
            />
            <div className={styles.meta}>
              <h3>{img.title}</h3>
              <p>{img.description}</p>
            </div>
            <button onClick={() => handleDelete(img.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GalleryAdmin;
