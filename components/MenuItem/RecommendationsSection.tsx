// File: components/MenuItem/RecommendationsSection.tsx
"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./ItemDetailPage.module.css"; // re-use existing CSS

import type { MenuItem as MenuItemType } from "@/utils/types";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";

interface RecommendationsSectionProps {
  /** Heading to display above the thumbnails */
  title: string;
  /** Array of menu items to show (must already exclude the current item) */
  items: (MenuItemType & {
    cloudinaryPublicId?: string;
    imageUrl?: string;
  })[];
  /** Lower-case provenance string (“golf”, “main”, or blank) for deep-links */
  provenance: string;
}

export default function RecommendationsSection({
  title,
  items,
  provenance,
}: RecommendationsSectionProps) {
  const router = useRouter();
  const THUMB_SIZE = 150;

  return (
    <div className={styles.recommendations}>
      <h3 className={styles.recommendationsTitle}>{title}</h3>
      <div className={styles.drinkList}>
        {items.map((rec) => {
          // choose Cloudinary thumbnail or fallback
          const src = rec.cloudinaryPublicId
            ? getCloudinaryImageUrl(rec.cloudinaryPublicId, THUMB_SIZE, THUMB_SIZE)
            : rec.imageUrl
            ? rec.imageUrl
            : rec.image || "";

          return (
            <div
              key={rec.id}
              className={styles.drinkItem}
              onClick={() =>
                router.push(
                  `/menuitem/${rec.id}?highlight=true&from=${provenance}`
                )
              }
            >
              {src && (
                <Image
                  src={src}
                  alt={rec.title}
                  width={THUMB_SIZE}
                  height={THUMB_SIZE}
                  unoptimized
                  className={styles.drinkImage}
                />
              )}
              <p className={styles.drinkTitle}>{rec.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
