// File: components/Banner/Banner.tsx

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import styles from "./Banner.module.css";

interface Slide {
  id:       string;
  type:     "IMAGE" | "VIDEO";
  imageUrl: string | null;
  videoUrl: string | null;
  alt:      string;
}

// Fallback slide if database is empty
const DEFAULT_SLIDE: Slide = {
  id:       "default",
  type:     "IMAGE",
  imageUrl: "/images/home-cover.jpg",
  videoUrl: null,
  alt:      "The 19th Hole Restaurant and Bar",
};

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json() as Promise<Slide[]>);

export default function Banner() {
  const { data } = useSWR<Slide[]>("/api/banner-images", fetcher);
  const slides = data && data.length ? data : [DEFAULT_SLIDE];

  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides]);

  return (
    <section className={styles.banner}>
      {slides.map((s, idx) => {
        const isActive = idx === current;

        // Only apply Cloudinary transform to images; pass videos as-is
        const imageSrc =
          s.imageUrl && s.imageUrl.includes("res.cloudinary.com")
            ? s.imageUrl.replace(
                "/upload/",
                "/upload/c_fill,g_auto,w_auto,f_auto,q_auto/"
              )
            : s.imageUrl ?? "";

        return (
          <div
            key={s.id}
            className={`${styles.bannerImageContainer} ${
              isActive ? styles.active : styles.inactive
            }`}
          >
            {s.type === "VIDEO" && s.videoUrl ? (
              <video
                src={s.videoUrl}
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Image
                src={imageSrc}
                alt={s.alt}
                fill
                priority={idx === 0}
                sizes="100vw"
                style={{ objectFit: "cover" }}
              />
            )}
          </div>
        );
      })}

      {/*
      <div className={styles.bannerContent}>
        <div className={styles.textWrapper}>
          <h1 className={`${styles.bannerTitle} ${styles.animatedTitle}`}>
            Welcome to The&nbsp;19<sup>th</sup>&nbsp;Hole&nbsp;at&nbsp;Black&nbsp;Rock
          </h1>
          <p className={styles.bannerSubtitle}>
            Experience the finest dining and entertainment
          </p>
        </div>
      </div>
      */}

      {/* Buttons positioned independently */}
      <div className={styles.bannerButtons}>
        <Link
          href="/menu"
          className={`${styles.button} ${styles.primaryButton}`}
          aria-label="Order Now"
        >
          Order Now
        </Link>
        <Link
          href="/reservation"
          className={`${styles.button} ${styles.secondaryButton}`}
          aria-label="Book a Table"
        >
          Book a Table
        </Link>
      </div>

      {/* Pagination bullets */}
      {slides.length > 1 && (
        <div
          className={styles.bullets}
          role="tablist"
          aria-label="Banner slider controls"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              aria-selected={i === current}
              className={i === current ? styles.bulletActive : styles.bullet}
            />
          ))}
        </div>
      )}
    </section>
  );
}
