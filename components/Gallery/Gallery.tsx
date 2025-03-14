"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Gallery.module.css";

const images = [
  { src: "/images/gallery1.jpg", alt: "African Cuisine Dish 1" },
  { src: "/images/gallery2.jpg", alt: "African Cuisine Dish 2" },
  { src: "/images/gallery3.jpg", alt: "African Cuisine Dish 3" },
  { src: "/images/gallery4.jpg", alt: "African Cuisine Dish 4" },
];

const Gallery: React.FC = () => {
  // Use index (number) to track the current image; null when no modal is open
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const pathname = usePathname();

  // Open modal with the selected image index
  const openModal = (index: number) => {
    setSelectedIndex(index);
  };

  // Close the modal
  const closeModal = () => {
    setSelectedIndex(null);
  };

  // Show next image (wraps around)
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent closing modal on button click
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % images.length);
    }
  };

  // Show previous image (wraps around)
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
    }
  };

  return (
    <section className={styles.gallery}>
      <div className={styles.container}>
        <h2 className={styles.heading}>Gallery</h2>

        {/* Gallery Grid */}
        <div className={styles.galleryGrid}>
          {images.map((img, idx) => (
            <div
              key={idx}
              className={styles.galleryItem}
              onClick={() => openModal(idx)}
            >
              <Image
                src={img.src}
                alt={img.alt}
                className={styles.galleryImage}
                width={300}
                height={200}
                placeholder="blur"
                blurDataURL={img.src}
                style={{ objectFit: "cover" }}
                quality={80}
              />
            </div>
          ))}
        </div>

        {/* View Full Gallery button (only if not on /gallery page) */}
        {pathname !== "/gallery" && (
          <Link href="/gallery" className={styles.viewGalleryButton}>
            View Full Gallery
          </Link>
        )}
      </div>

      {/* Modal Overlay */}
      {selectedIndex !== null && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              className={styles.closeButton}
              onClick={closeModal}
            >
              <span>×</span>
            </button>

            {/* Modal Image */}
            <div className={styles.modalImageWrapper}>
              <Image
                src={images[selectedIndex].src}
                alt={images[selectedIndex].alt}
                fill
                style={{ objectFit: "contain" }}
                quality={90}
              />
            </div>

            {/* Navigation Buttons */}
            <button
              type="button"
              className={styles.prevButton}
              onClick={prevImage}
            >
              <span>‹</span>
            </button>
            <button
              type="button"
              className={styles.nextButton}
              onClick={nextImage}
            >
              <span>›</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default Gallery;
