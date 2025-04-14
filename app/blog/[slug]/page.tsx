import BlogDetailPage from "@/components/Blog/BlogDetailPage";

/**
 * Must be async to properly use dynamic params in Next.js 13/15.
 */
export default async function BlogSlugPage(context: { params: { slug: string } }) {
  const { slug } = context.params; // Access the slug inside the function body
  return <BlogDetailPage slug={slug} />;
}
