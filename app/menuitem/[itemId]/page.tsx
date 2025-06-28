// File: app/menuitem/[itemId]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@/lib/prisma";
import { getSameCategorySuggestions } from "@/lib/recommendations";
import ItemDetailPage from "@/components/MenuItem/ItemDetailPage";
import type { MenuItem } from "@/utils/types";
import { notFound } from "next/navigation";

interface PageProps {
  params: { itemId: string };
}

export default async function Page({ params }: PageProps) {
  /* 0. Resolve params (Next 15 dynamic routes return a Promise) */
  const { itemId } = await Promise.resolve(params);

  /* 1. Fetch the requested menu item (with nested option groups) */
  const foundItemRaw = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: {
      category: true,
      optionGroups: {
        include: {
          choices: {
            include: {
              nestedOptionGroup: { include: { choices: true } },
            },
          },
        },
      },
    },
  });
  if (!foundItemRaw) return notFound();

  const foundItem = foundItemRaw as unknown as MenuItem;

  /* 2. Dynamic same-category suggestions */
  const sameCategory = await getSameCategorySuggestions(prisma, itemId, 8);

  /* 3. Render client component */
  return (
    <ItemDetailPage
      item={foundItem}
      sameCategory={sameCategory as unknown as MenuItem[]}
    />
  );
}
