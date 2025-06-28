"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./ItemDetailPage.module.css";   // re-use existing CSS

import type { MenuItem as MenuItemType } from "@/utils/types";

interface Props {
  /** Heading to display above the thumbnails */
  title: string;
  /** Array of menu items to show (must already exclude the current item) */
  items: MenuItemType[];
  /** Lower-case provenance string (“golf”, “main”, or blank) for deep-links */
  provenance: string;
}

export default function RecommendationsSection({
  title,
  items,
  provenance,
}: Props) {
  const router = useRouter();

  return (
    <div className={styles.recommendations}>
      <h3 className={styles.recommendationsTitle}>{title}</h3>

      <div className={styles.drinkList}>
        {items.map((rec) => (
          <div
            key={rec.id}
            className={styles.drinkItem}
            onClick={() =>
              router.push(
                `/menuitem/${rec.id}?highlight=true&from=${provenance}`
              )
            }
          >
            <Image
              src={rec.image || ""}
              alt={rec.title}
              width={100}
              height={100}
              unoptimized
              className={styles.drinkImage}
            />
            <p className={styles.drinkTitle}>{rec.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
