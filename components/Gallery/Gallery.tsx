"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Gallery.module.css";

interface GalleryImage {
  id: number;
  src: string;
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
        const data = await res.json();
        setImages(data);
      } catch (error) {
        console.error("Error fetching gallery images:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, []);

  // Auto-slide when not paused (only if images exist)
  useEffect(() => {
    if (!isPaused && images.length > 0) {
      const timer = setInterval(() => {
        nextImage();
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [selectedIndex, isPaused, images]);

  // Keyboard navigation: left/right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextImage();
      else if (e.key === "ArrowLeft") prevImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, images]);

  // Advance to next image, wrapping around
  const nextImage = () => {
    if (images.length > 0) {
      setDirection(1);
      setSelectedIndex((selectedIndex + 1) % images.length);
    }
  };

  // Go to previous image, wrapping around
  const prevImage = () => {
    if (images.length > 0) {
      setDirection(-1);
      setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
    }
  };

  // Drag end handling for swipe navigation
  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -50) nextImage();
    else if (info.offset.x > 50) prevImage();
  };

  // Framer Motion variants for enter, center, exit
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  // You can merge any additional properties if needed; here we simply use the center object.
  const mergedCenterAnimation = { ...variants.center };

  return (
    <section className={styles.gallery}>
      <h1 className={styles.pageTitle}>Gallery</h1>
      {isLoading ? (
        <div>Loading...</div>
      ) : images.length === 0 ? (
        <div className={styles.noImages}>
          <span className={styles.noImagesIcon} role="img" aria-label="No images">
            📷
          </span>
          <p>Oops! The gallery is currently empty.</p>
        </div>
      ) : (
        <div className={styles.galleryContainer}>
          {/* Main Content: Image with metadata */}
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
                  animate={mergedCenterAnimation}
                  exit="exit"
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className={styles.motionImageWrapper}
                  drag={false}
                  onDragEnd={handleDragEnd}
                  style={{ cursor: "default" }}
                >
                  <Image
                    src={images[selectedIndex].src}
                    alt={images[selectedIndex].alt}
                    fill
                    style={{ objectFit: "contain" }}
                    quality={90}
                    priority
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </motion.div>
              </AnimatePresence>
              <button className={styles.navButtonLeft} onClick={prevImage}>
                ‹
              </button>
              <button className={styles.navButtonRight} onClick={nextImage}>
                ›
              </button>
            </div>
            <div className={styles.metadata}>
              <h3>{images[selectedIndex].title}</h3>
              <p>{images[selectedIndex].description}</p>
            </div>
          </div>
          {/* Thumbnails for quick navigation */}
          <div className={styles.thumbnailContainer}>
            {images.map((img, idx) => (
              <div
                key={img.id}
                className={`${styles.thumbnail} ${
                  idx === selectedIndex ? styles.activeThumbnail : ""
                }`}
                onClick={() => setSelectedIndex(idx)}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={80}
                  height={60}
                  style={{ objectFit: "cover" }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default Gallery;
