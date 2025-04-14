import BlogTabs from "@/components/Blog/BlogTabs";

// Renders the same tab UI, but defaults to the "news" tab
export default function NewsIndexPage() {
  return <BlogTabs defaultTab="news" />;
}
