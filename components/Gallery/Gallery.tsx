// File: components/Gallery/Gallery.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Gallery.module.css";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";

interface GalleryImage {
  id: number;
  imageUrl?: string;            // legacy/public URL
  cloudinaryPublicId?: string;  // Cloudinary public ID
  alt: string;
  title: string;
  description: string;
}

const Gallery: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch images on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/gallery");
        const data: GalleryImage[] = await res.json();
        setImages(data);
      } catch (err) {
        console.error("Error fetching gallery images:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 2. Auto-advance every 5s when not paused
  useEffect(() => {
    if (!isPaused && images.length > 1) {
      const id = setInterval(() => slide(1), 5000);
      return () => clearInterval(id);
    }
  }, [isPaused, images]);

  // 3. Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") slide(1);
      if (e.key === "ArrowLeft") slide(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images]);

  // Slide helper
  const slide = (dir: number) => {
    setDirection(dir);
    setCurrentIndex((i) => (i + dir + images.length) % images.length);
  };

  // Loading state
  if (isLoading) {
    return (
      <section className={styles.gallery}>
        <h1 className={styles.pageTitle}>Gallery</h1>
        <div>Loading…</div>
      </section>
    );
  }

  // Empty state
  if (images.length === 0) {
    return (
      <section className={styles.gallery}>
        <h1 className={styles.pageTitle}>Gallery</h1>
        <div className={styles.noImages}>
          <span className={styles.noImagesIcon} role="img" aria-label="No images">
            📷
          </span>
          <p>Oops! The gallery is currently empty.</p>
        </div>
      </section>
    );
  }

  // Motion variants for swipe
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  // Current image data
  const current = images[currentIndex];
  const mainSrc = current.cloudinaryPublicId
    ? getCloudinaryImageUrl(current.cloudinaryPublicId, 800, 600, "fit")
    : current.imageUrl || "/images/placeholder.png";

  return (
    <section className={styles.gallery}>
      <h1 className={styles.pageTitle}>Gallery</h1>

      <div className={styles.galleryContainer}>
        {/* Main image pane */}
        <div className={styles.mainContent}>
          <div
            className={styles.mainImageContainer}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className={styles.motionImageWrapper}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) slide(1);
                  else if (info.offset.x > 50) slide(-1);
                }}
              >
                <Image
                  src={mainSrc}
                  alt={current.alt}
                  fill
                  style={{ objectFit: "contain" }}
                  priority
                  sizes="(max-width: 768px) 100vw, 800px"
                  unoptimized
                />
              </motion.div>
            </AnimatePresence>

            <button className={styles.navButtonLeft} onClick={() => slide(-1)}>
              ‹
            </button>
            <button className={styles.navButtonRight} onClick={() => slide(1)}>
              ›
            </button>
          </div>

          <div className={styles.metadata}>
            <h3>{current.title}</h3>
            <p>{current.description}</p>
          </div>
        </div>

        {/* Thumbnails */}
        <div className={styles.thumbnailContainer}>
          {images.map((img, idx) => {
            const thumbSrc = img.cloudinaryPublicId
              ? getCloudinaryImageUrl(img.cloudinaryPublicId, 150, 100, "fit")
              : img.imageUrl || "/images/placeholder.png";

            return (
              <div
                key={img.id}
                className={`${styles.thumbnailWrapper} ${
                  idx === currentIndex ? styles.activeThumbnail : ""
                }`}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
              >
                <Image
                  src={thumbSrc}
                  alt={img.alt}
                  fill
                  style={{
                    objectFit: "contain",
                    objectPosition: "center",
                  }}
                  sizes="80px"
                  unoptimized
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Gallery;
