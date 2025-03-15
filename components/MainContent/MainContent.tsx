"use client";

import React from "react";
import Banner from "../Banner/Banner";
import NeonSign from "../NeonSign/NeonSign";
import MenuPreview from "../MenuPreview/MenuPreview";
import Gallery from "../Gallery/Gallery";
import Link from "next/link";
import Image from "next/image";
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
              <Image
                src="/images/staff-abtus.jpg"
                alt="Restaurant Interior"
                className="img-fluid rounded shadow"
                width={600}
                height={400}
              />
            </div>

            {/* Right Column - Text Content */}
            <div className="col-lg-6 d-flex flex-column justify-content-center">
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
                <Link href="/menu" legacyBehavior>
                  <a className={styles.sweepLink}>menu</a>
                </Link>{" "}
                and unparalleled{" "}
                <Link href="/about" legacyBehavior>
                  <a className={styles.sweepLink}>service</a>
                </Link>{" "}
                that caters to all your senses. Click &quot;Read More&quot; to see our services...
              </p>
              <Link href="/about" legacyBehavior>
                <a className={styles.readMoreBtn}>Read More</a>
              </Link>
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
