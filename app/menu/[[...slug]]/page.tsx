// File: app/menu/[...slug]/page.tsx (or however you've named it)

import MenuComponent from "@/components/Menu/Menu";

interface MenuPageProps {
  // params is a Promise that resolves to an object with an optional slug array.
  params: Promise<{ slug?: string[] }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
  // Await the parameters before using them.
  const { slug } = await params;
  let resolvedSlug: string[] = slug ?? [];

  // If there's no section slug, default to MainMenu. 
  // (We DO NOT force a second part of the slug, so the Menu component can pick the first sub-category.)
  if (resolvedSlug.length === 0) {
    resolvedSlug = ["MainMenu"];
  }

  // Optionally, if you want at least a section but no sub-category, 
  // you can do something like:
  // if (resolvedSlug.length < 1) {
  //   resolvedSlug = ["MainMenu"];
  // }

  // If the slug has fewer than 2 segments (just "MainMenu"), 
  // we let the Menu component handle picking the first sub-category from the DB.
  // No forced "Lunch/Dinner" anymore.

  // If you still want to merge "Lunch" + "Dinner" => "Lunch/Dinner", keep that logic:
  if (
    resolvedSlug.length >= 3 &&
    resolvedSlug[1].toLowerCase() === "lunch" &&
    resolvedSlug[2].toLowerCase() === "dinner"
  ) {
    resolvedSlug = [resolvedSlug[0], "Lunch/Dinner"];
  }

  return <MenuComponent slug={resolvedSlug} />;
}
