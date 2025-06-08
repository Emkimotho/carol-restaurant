// File: components/dashboard/AdminDashboard/Banner/BannerManager.tsx

"use client";

import React, { useState, useRef } from "react";
import useSWR from "swr";
import Image from "next/image";
import styles from "./BannerManager.module.css";

interface Slide {
  id:       string;
  type:     "IMAGE" | "VIDEO";
  imageUrl: string | null;
  videoUrl: string | null;
  alt:      string;
  position: number;
}

type Kind = "image" | "video";

const fetcher = (url: string) => fetch(url).then((res) => res.json() as Promise<Slide[]>);

export default function BannerManager() {
  const { data: slides = [], mutate } = useSWR<Slide[]>("/api/admin/banner-images", fetcher);

  const [isCreating, setIsCreating]       = useState(false);
  const [kind, setKind]                   = useState<Kind>("image");
  const [altText, setAltText]             = useState("");
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* Preview the chosen file (image or video) locally */
  const handleFileChange = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /* Send FormData to our POST API */
  const saveNewSlide = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !altText.trim()) {
      alert("Please choose a file and enter alt text.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("alt", altText);

    const resp = await fetch("/api/admin/banner-images", {
      method: "POST",
      body: formData,
    });

    if (!resp.ok) {
      // Attempt to parse JSON error; fallback to plain text if parsing fails
      let errorMessage = "Failed to save slide.";
      try {
        const json = await resp.json();
        if (json.error) {
          errorMessage = json.error;
        }
      } catch {
        const text = await resp.text();
        if (text) {
          errorMessage = text;
        }
      }
      alert(errorMessage);
    } else {
      // Reset on success
      setAltText("");
      setFilePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsCreating(false);
      mutate(); // re-fetch slides
    }
  };

  const deleteSlide = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    await fetch(`/api/admin/banner-images/${id}`, { method: "DELETE" });
    mutate();
  };

  // Count how many image slides already exist
  const imageSlideCount = slides.filter((s) => s.type === "IMAGE").length;

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>Banner Slides</h1>

      {/* Disable “+ Add Slide” if we’re in Image mode and already have 3 images */}
      <button
        className={styles.addBtn}
        onClick={() => setIsCreating(true)}
        disabled={kind === "image" && imageSlideCount >= 3}
      >
        + Add Slide
      </button>

      {kind === "image" && imageSlideCount >= 3 && (
        <p className={styles.note}>
          You already have 3 image slides. Delete one to add a new image.
        </p>
      )}

      {isCreating && (
        <div className={styles.form}>
          <div className={styles.toggleRow}>
            <label className={styles.toggleLabel}>
              <input
                type="radio"
                value="image"
                checked={kind === "image"}
                onChange={() => {
                  setKind("image");
                  setFilePreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              Image
            </label>
            <label className={styles.toggleLabel}>
              <input
                type="radio"
                value="video"
                checked={kind === "video"}
                onChange={() => {
                  setKind("video");
                  setFilePreviewUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              Video
            </label>
          </div>

          <label className={styles.field}>
            <span>Choose a {kind} file:</span>
            <input
              ref={fileInputRef}
              type="file"
              accept={kind === "image" ? "image/*" : "video/*"}
              onChange={handleFileChange}
            />
          </label>

          {filePreviewUrl && kind === "image" && (
            <div className={styles.previewContainer}>
              <Image
                src={filePreviewUrl}
                alt="Preview"
                fill
                sizes="200px"
                style={{ objectFit: "cover" }}
              />
            </div>
          )}

          {filePreviewUrl && kind === "video" && (
            <div className={styles.previewContainerVideo}>
              <video
                src={filePreviewUrl}
                muted
                loop
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}

          <label className={styles.field}>
            <span>Alt text:</span>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe this slide for accessibility"
            />
          </label>

          <div className={styles.buttonRow}>
            <button className={styles.saveBtn} onClick={saveNewSlide}>
              Save Slide
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => {
                setIsCreating(false);
                setAltText("");
                setFilePreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <ul className={styles.grid}>
        {slides.map((slide) => (
          <li key={slide.id} className={styles.card}>
            <div className={styles.thumb}>
              {slide.type === "IMAGE" && slide.imageUrl && (
                <Image
                  src={slide.imageUrl}
                  alt={slide.alt}
                  fill
                  sizes="200px"
                  style={{ objectFit: "cover" }}
                />
              )}
              {slide.type === "VIDEO" && slide.videoUrl && (
                <video
                  src={slide.videoUrl}
                  muted
                  loop
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </div>
            <p className={styles.alt}>{slide.alt}</p>
            <button
              className={styles.deleteBtn}
              onClick={() => deleteSlide(slide.id)}
              aria-label="Delete slide"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
