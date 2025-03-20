// app/menu/[itemId]/page.tsx

import menuData from "@/data/menuData";
import ItemDetailPage from "./ItemDetailPage";

// The default export is a synchronous function so that 'params' remains a plain object.
export default function Page({
  params,
}: {
  params: { itemId: string };
}) {
  const { itemId } = params;
  const item = menuData.find((i) => String(i.id) === itemId);

  if (!item) {
    return <div>Item not found!</div>;
  }

  return <ItemDetailPage item={item} />;
}
