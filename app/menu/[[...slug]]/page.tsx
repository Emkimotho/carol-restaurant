import MenuComponent from "@/components/Menu/Menu";

interface MenuPageProps {
  // params is a Promise that resolves to an object with an optional slug array.
  params: Promise<{ slug?: string[] }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
  // Await the parameters before using them.
  const { slug } = await params;
  let resolvedSlug: string[] = slug ?? [];

  // If the slug has fewer than two segments (e.g., section and category), set defaults.
  if (resolvedSlug.length < 2) {
    resolvedSlug = [resolvedSlug[0] || "MainMenu", "Lunch/Dinner"];
  }

  // Merge separate "lunch" and "dinner" segments into "Lunch/Dinner" if found.
  if (
    resolvedSlug.length >= 3 &&
    resolvedSlug[1].toLowerCase() === "lunch" &&
    resolvedSlug[2].toLowerCase() === "dinner"
  ) {
    resolvedSlug = [resolvedSlug[0], "Lunch/Dinner"];
  }

  return <MenuComponent slug={resolvedSlug} />;
}
