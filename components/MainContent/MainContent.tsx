"use client";

import React from "react";
import { motion, useScroll, useTransform } from "framer-motion"; // ← useScroll instead of deprecated useViewportScroll
import Banner from "../Banner/Banner";
import NeonSign from "../NeonSign/NeonSign";
import MenuPreview from "../MenuPreview/MenuPreview";
import Gallery from "../Gallery/Gallery";
import SlidingServices from "../SlidingServices/SlidingServices";
import Link from "next/link";
import Image from "next/image";
import styles from "./MainContent.module.css";

const MainContent: React.FC = () => {
  // Parallax effect for Banner
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 300], [0, -50]);

  return (
    <div className={styles.mainContent}>
      {/* Banner with parallax */}
      <motion.div style={{ y: parallaxY }}>
        <Banner />
      </motion.div>

      {/* Neon Sign */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <NeonSign />
      </motion.div>

      {/* About Us */}
      <section className={styles.aboutUs}>
        <div className="container">
          <div className="row">
            {/* Image (Above the fold → priority + sizes) */}
            <motion.div
              className="col-lg-6 mb-4 mb-lg-0"
              initial={{ opacity: 0, x: -100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              <Image
                src="/images/staff-abtus.jpg"
                alt="Dining area at The 19th Hole Restaurant"
                width={600}
                height={400}
                priority                      // preload as LCP
                placeholder="empty"          // no blur placeholder
                sizes="(max-width: 992px) 100vw, 600px"
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: "0.5rem",
                }}
              />
            </motion.div>

            {/* Text */}
            <motion.div
              className="col-lg-6 d-flex flex-column justify-content-center"
              initial={{ opacity: 0, x: 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              <h2>About Us</h2>
              <p>
                Experience fine dining at The 19th Hole Restaurant & Bar, nestled on the scenic{" "}
                <a
                  href="https://www.washco-md.net/black-rock-golf-course/"
                  className={styles.sweepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Black Rock Golf Course
                </a>
                . Enjoy our carefully curated{" "}
                <Link href="/menu" className={styles.sweepLink}>
                  menu
                </Link>{" "}
                and unmatched{" "}
                <Link href="/about" className={styles.sweepLink}>
                  service
                </Link>
                . Click “Read More” to explore our offerings.
              </p>
              <Link href="/about" className={styles.readMoreBtn}>
                Read More
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Menu Preview */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <MenuPreview />
      </motion.div>

      {/* Sliding Services */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <SlidingServices />
      </motion.div>

      {/* Gallery */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <Gallery />
      </motion.div>
    </div>
  );
};

export default MainContent;
