import MenuComponent from '@/components/Menu/Menu';

interface MenuPageProps {
  // Next.js expects the parameters to be a Promise that resolves to an object.
  params: Promise<{ slug?: string[] }>;
}

export default async function MenuPage({ params }: MenuPageProps) {
  // Await the resolved params object.
  const { slug } = await params;
  let resolvedSlug: string[] = slug ?? [];

  // If the slug contains separate segments for "lunch" and "dinner", merge them.
  // For example, if slug is ["MainMenu", "lunch", "dinner"] (case-insensitive),
  // then change it to ["MainMenu", "Lunch/Dinner"].
  if (
    resolvedSlug.length >= 3 &&
    resolvedSlug[1].toLowerCase() === "lunch" &&
    resolvedSlug[2].toLowerCase() === "dinner"
  ) {
    resolvedSlug = [resolvedSlug[0], "Lunch/Dinner"];
  }

  return <MenuComponent slug={resolvedSlug} />;
}
