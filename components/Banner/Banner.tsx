"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './Banner.module.css';

const Banner: React.FC = () => {
  return (
    <section className={styles.banner}>
      <div className={styles.bannerImageContainer}>
        <Image
          src="/images/home-cover.jpg"
          alt="The 19th Hole Restaurant and Bar"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />
      </div>
      <div className={styles.bannerContent}>
        <h1 className={styles.bannerTitle}>Welcome to The 19th Hole at Black Rock</h1>
        <p className={styles.bannerSubtitle}>
          Experience the finest dining and entertainment
        </p>
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
      </div>
    </section>
  );
};

export default Banner;
