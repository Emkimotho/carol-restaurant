"use client";

import React from "react";
import { motion, useViewportScroll, useTransform } from "framer-motion";
import Banner from "../Banner/Banner";
import NeonSign from "../NeonSign/NeonSign";
import MenuPreview from "../MenuPreview/MenuPreview";
import Gallery from "../Gallery/Gallery";
import SlidingServices from "components/SlidingServices/SlidingServices";
import Link from "next/link";
import Image from "next/image";
import styles from "./MainContent.module.css";

const MainContent: React.FC = () => {
  // Create a parallax effect for the Banner
  const { scrollY } = useViewportScroll();
  const parallaxY = useTransform(scrollY, [0, 300], [0, -50]);

  return (
    <div className={styles.mainContent}>
      {/* Banner Section with Parallax */}
      <motion.div style={{ y: parallaxY }}>
        <Banner />
      </motion.div>

      {/* Neon Sign Section - fades & slides in on scroll */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <NeonSign />
      </motion.div>

      {/* About Us Section */}
      <section className={styles.aboutUs}>
        <div className="container">
          <div className="row">
            {/* Left Column - Image */}
            <motion.div
              className="col-lg-6 mb-4 mb-lg-0"
              initial={{ opacity: 0, x: -100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              <Image
                src="/images/staff-abtus.jpg"
                alt="Restaurant Interior"
                className="img-fluid rounded shadow"
                width={600}
                height={400}
              />
            </motion.div>

            {/* Right Column - Text Content */}
            <motion.div
              className="col-lg-6 d-flex flex-column justify-content-center"
              initial={{ opacity: 0, x: 100 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
            >
              <h2>About Us</h2>
              <p>
                Experience fine dining at its best at The 19th Hole Restaurant and Bar. Nestled within the scenic{" "}
                <a
                  href="https://www.washco-md.net/black-rock-golf-course/"
                  className={styles.sweepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Black Rock Golf Course
                </a>
                , we offer an exquisite{" "}
                <Link href="/menu" className={styles.sweepLink}>
                  menu
                </Link>{" "}
                and unparalleled{" "}
                <Link href="/about" className={styles.sweepLink}>
                  service
                </Link>{" "}
                that caters to all your senses. Click &quot;Read More&quot; to see our services...
              </p>
              <Link href="/about" className={styles.readMoreBtn}>
                Read More
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Menu Preview Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <MenuPreview />
      </motion.div>

      {/* Sliding Services Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
      >
        <SlidingServices />
      </motion.div>

      {/* Gallery Section */}
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
