"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./MenuPreview.module.css";

const MenuPreview: React.FC = () => {
  return (
    <section className={styles.menuPreview}>
      <div className={`${styles.container} container text-center`}>
        <h2>Menu Preview</h2>
        <div className="row mt-4">
          {/* Menu Item 1 */}
          <div className="col-md-4">
            <div className={styles.menuItem}>
              <Image
                src="/images/menu-item1.jpg"
                alt="Signature Steak"
                width={300}
                height={200}
                style={{ objectFit: "cover" }}
                quality={80}
                placeholder="blur"
                blurDataURL="/images/menu-item1.jpg"
                className="img-fluid"
              />
              <h4>Signature Steak</h4>
              <p>Our finest cut, grilled to perfection.</p>
            </div>
          </div>

          {/* Menu Item 2 */}
          <div className="col-md-4">
            <div className={styles.menuItem}>
              <Image
                src="/images/menu-item2.jpg"
                alt="Seafood Platter"
                width={300}
                height={200}
                style={{ objectFit: "cover" }}
                quality={80}
                placeholder="blur"
                blurDataURL="/images/menu-item2.jpg"
                className="img-fluid"
              />
              <h4>Seafood Platter</h4>
              <p>A delightful assortment of fresh seafood.</p>
            </div>
          </div>

          {/* Menu Item 3 */}
          <div className="col-md-4">
            <div className={styles.menuItem}>
              <Image
                src="/images/menu-item3.jpg"
                alt="Garden Salad"
                width={300}
                height={200}
                style={{ objectFit: "cover" }}
                quality={80}
                placeholder="blur"
                blurDataURL="/images/menu-item3.jpg"
                className="img-fluid"
              />
              <h4>Garden Salad</h4>
              <p>A fresh mix of organic greens and vegetables.</p>
            </div>
          </div>
        </div>

        <Link href="/menu" className={`${styles.btn} btn mt-4`}>
          View Full Menu
        </Link>
      </div>
    </section>
  );
};

export default MenuPreview;
