// File: app/menuitem/[itemId]/page.tsx

import { prisma } from "@/lib/prisma";
import ItemDetailPage from "@/components/MenuItem/ItemDetailPage";
import type { MenuItem } from "@/utils/types";
import { notFound } from "next/navigation";

interface PageProps {
  params: { itemId: string };
}

/**
 * Renders /menuitem/[itemId] for the item detail page.
 * Includes nested optionGroups, category, etc.
 */
export default async function Page({ params }: PageProps) {
  // Await the params to satisfy Next.js’s requirement
  const resolvedParams = await Promise.resolve(params);
  const { itemId } = resolvedParams;

  // 1. Fetch the requested menu item with its category and optionGroups (including nested choices)
  const foundItemRaw = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: {
      category: true,
      optionGroups: {
        include: {
          choices: {
            include: {
              nestedOptionGroup: {
                include: {
                  choices: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!foundItemRaw) {
    // If no menu item found, use Next.js's notFound() helper.
    return notFound();
  }

  // Cast the raw item to your local MenuItem type.
  const foundItem = foundItemRaw as unknown as MenuItem;

  // 2. Optionally fetch all items for recommended sections
  const allItemsRaw = await prisma.menuItem.findMany({
    include: { category: true },
  });
  const allItems = allItemsRaw as unknown as MenuItem[];

  // Filter recommended items by category:
  const recommendedDrinks = allItems.filter(
    (m) => m.category && m.category.name === "Soft Drinks"
  );
  const desserts = allItems.filter(
    (m) => m.category && m.category.name === "Desserts"
  );
  const snacks = allItems.filter(
    (m) => m.category && m.category.name === "Snacks"
  );
  const softDrinks = allItems.filter(
    (m) => m.category && m.category.name === "Soft Drinks"
  );

  // 3. Render the client component with the found item and recommended sections
  return (
    <ItemDetailPage
      item={foundItem}
      recommendedDrinks={recommendedDrinks}
      desserts={desserts}
      snacks={snacks}
      softDrinks={softDrinks}
    />
  );
}
