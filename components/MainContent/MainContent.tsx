"use client";

import React from "react";
import Banner from "../Banner/Banner";
import NeonSign from "../NeonSign/NeonSign";
import MenuPreview from "../MenuPreview/MenuPreview";
import Gallery from "../Gallery/Gallery";
import Link from "next/link";
import styles from "./MainContent.module.css";

const MainContent: React.FC = () => {
  return (
    <div className={styles.mainContent}>
      {/* Banner Section */}
      <Banner />

      {/* Neon Sign Section */}
      <NeonSign />

      {/* About Us Section */}
      <section className={styles.aboutUs}>
        <div className="container">
          <div className="row">
            {/* Left Column - Image */}
            <div className="col-lg-6 mb-4 mb-lg-0">
              <img
                src="/images/staff-abtus.jpg"
                alt="Restaurant Interior"
                className="img-fluid rounded shadow"
              />
            </div>

            {/* Right Column - Text Content */}
            <div className="col-lg-6 d-flex flex-column justify-content-center">
              <h2>About Us</h2>
              <p>
                Experience fine dining at its best at The 19th Hole Restaurant and Bar.
                Nestled within the scenic{" "}
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
                that caters to all your senses. Click "Read More" to see our services...
              </p>
              <a href="/about" className={styles.readMoreBtn}>
                Read More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Preview Section */}
      <MenuPreview />

      {/* Gallery Section */}
      <Gallery />
    </div>
  );
};

export default MainContent;
