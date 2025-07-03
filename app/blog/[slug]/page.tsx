// File: app/blog/[slug]/page.tsx

import React from "react";
import BlogDetailPage from "@/components/Blog/BlogDetailPage";

interface Params {
  slug: string;
}

export default async function BlogSlugPage({
  params,
}: {
  params: Promise<Params>;
}) {
  // Await the dynamic params before destructuring
  const { slug } = await params;

  return <BlogDetailPage slug={slug} />;
}
