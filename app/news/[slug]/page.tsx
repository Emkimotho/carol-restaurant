import NewsDetailPage from "@/components/Blog/NewsDetailPage";

/**
 * Must be async to properly use dynamic params.
 */
export default async function NewsSlugPage(context: { params: { slug: string } }) {
  const { slug } = context.params;
  return <NewsDetailPage slug={slug} />;
}
