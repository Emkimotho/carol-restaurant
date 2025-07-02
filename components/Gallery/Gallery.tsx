// File: components/Gallery/Gallery.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Gallery.module.css";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";

interface GalleryImage {
  id: number;
  url?: string;                  // legacy/public URL
  cloudinaryPublicId?: string;   // Cloudinary public ID
  alt: string;
  title: string;
  description: string;
}

const Gallery: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch images from API
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetch("/api/gallery");
        const data: GalleryImage[] = await res.json();
        setImages(data);
      } catch (error) {
        console.error("Error fetching gallery images:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, []);

  // Auto-slide when not paused
  useEffect(() => {
    if (!isPaused && images.length > 0) {
      const timer = setInterval(() => {
        setDirection(1);
        setSelectedIndex((i) => (i + 1) % images.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isPaused, images]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setDirection(1);
        setSelectedIndex((i) => (i + 1) % images.length);
      } else if (e.key === "ArrowLeft") {
        setDirection(-1);
        setSelectedIndex((i) => (i - 1 + images.length) % images.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images]);

  // Drag end for swipe
  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -50) {
      setDirection(1);
      setSelectedIndex((i) => (i + 1) % images.length);
    } else if (info.offset.x > 50) {
      setDirection(-1);
      setSelectedIndex((i) => (i - 1 + images.length) % images.length);
    }
  };

  // Motion variants
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  if (isLoading) {
    return (
      <section className={styles.gallery}>
        <h1 className={styles.pageTitle}>Gallery</h1>
        <div>Loading...</div>
      </section>
    );
  }

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

  const current = images[selectedIndex];
  // build src: Cloudinary if available, else fallback to url
  const mainSrc = current.cloudinaryPublicId
    ? getCloudinaryImageUrl(current.cloudinaryPublicId, 800, 600)
    : current.url || "/images/placeholder.png";

  return (
    <section className={styles.gallery}>
      <h1 className={styles.pageTitle}>Gallery</h1>

      <div className={styles.galleryContainer}>
        {/* Main Content */}
        <div className={styles.mainContent}>
          <div
            className={styles.mainImageContainer}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={selectedIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className={styles.motionImageWrapper}
                drag={false}
                onDragEnd={handleDragEnd}
              >
                <Image
                  src={mainSrc}
                  alt={current.alt}
                  fill
                  style={{ objectFit: "contain" }}
                  quality={90}
                  priority
                  sizes="(max-width: 768px) 100vw, 800px"
                  unoptimized
                />
              </motion.div>
            </AnimatePresence>
            <button className={styles.navButtonLeft} onClick={() => {
              setDirection(-1);
              setSelectedIndex((i) => (i - 1 + images.length) % images.length);
            }}>‹</button>
            <button className={styles.navButtonRight} onClick={() => {
              setDirection(1);
              setSelectedIndex((i) => (i + 1) % images.length);
            }}>›</button>
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
              ? getCloudinaryImageUrl(img.cloudinaryPublicId, 150, 100)
              : img.url || "/images/placeholder.png";

            return (
              <div
                key={img.id}
                className={`${styles.thumbnail} ${idx === selectedIndex ? styles.activeThumbnail : ""}`}
                onClick={() => {
                  setDirection(idx > selectedIndex ? 1 : -1);
                  setSelectedIndex(idx);
                }}
              >
                <Image
                  src={thumbSrc}
                  alt={img.alt}
                  width={80}
                  height={60}
                  style={{ objectFit: "cover" }}
                  loading="lazy"
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
