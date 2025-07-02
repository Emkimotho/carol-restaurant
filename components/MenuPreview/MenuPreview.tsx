// File: components/MenuPreview/MenuPreview.tsx
"use client";

import React from "react";
import useSWR from "swr";
import Image from "next/image";
import Link from "next/link";
import styles from "./MenuPreview.module.css";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";

interface PreviewItem {
  id: number;
  title: string;
  description: string | null;
  imageUrl?: string;            // legacy/public URL
  cloudinaryPublicId?: string;  // new Cloudinary ID
  displayOrder: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const MenuPreview: React.FC = () => {
  const { data, error } = useSWR<PreviewItem[]>("/api/menupreview", fetcher);

  if (error) {
    return (
      <p className="text-center text-danger">
        Failed to load menu preview.
      </p>
    );
  }
  if (!data) {
    return <p className="text-center">Loading preview…</p>;
  }

  const items: PreviewItem[] = Array.isArray(data) ? data : [];

  return (
    <section className={styles.menuPreview}>
      <div className="container text-center">
        <h2 className={styles.previewTitle}>Menu Preview</h2>
        <div className="row mt-4">
          {items.map((item) => {
            // pick Cloudinary if available, else fallback to imageUrl, else placeholder
            const src = item.cloudinaryPublicId
              ? getCloudinaryImageUrl(item.cloudinaryPublicId, 300, 300)
              : item.imageUrl || "/images/placeholder.png";

            return (
              <div key={item.id} className="col-md-4 mb-4">
                <div className={styles.menuItem}>
                  <div
                    style={{
                      position: "relative",
                      width: 300,
                      height: 300,
                      margin: "0 auto",
                    }}
                  >
                    <Image
                      src={src}
                      alt={item.title}
                      fill
                      style={{
                        objectFit: "cover",
                        borderRadius: "0.5rem",
                      }}
                      unoptimized
                    />
                  </div>
                  <h4 className={styles.itemTitle}>{item.title}</h4>
                  {item.description && (
                    <p className={styles.itemDesc}>{item.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Link href="/menu" className={`${styles.btn} btn mt-4`}>
          View Full Menu
        </Link>
      </div>
    </section>
  );
};

export default MenuPreview;
