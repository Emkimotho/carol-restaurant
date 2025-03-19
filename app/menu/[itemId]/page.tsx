// app/menu/[itemId]/page.tsx
import { Metadata } from "next";
import menuData from "@/data/menuData"; // your local data array or actual DB fetch
import ItemDetailPage from "./ItemDetailPage";

interface PageProps {
  params: { itemId: string };
  // (searchParams?: Record<string, string> if you want them)
}

// (Optional) dynamic metadata for SEO or in-browser tab title
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { itemId } = params;
  const item = menuData.find((i) => String(i.id) === itemId);
  return {
    title: item ? `Details of ${item.title}` : "Item Not Found",
  };
}

// This is your default-exported Server Component for the route.
export default async function Page({ params }: PageProps) {
  const { itemId } = params;

  // Example: Find item in local data array. Replace with your own fetching logic if needed.
  const item = menuData.find((i) => String(i.id) === itemId);

  if (!item) {
    // If not found, return some 404-ish UI or a Next.js notFound().
    return <div>Item not found!</div>;
  }

  // Render a separate Client Component for the actual detail UI
  return <ItemDetailPage item={item} />;
}
