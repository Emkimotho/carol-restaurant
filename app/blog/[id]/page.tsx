import BlogDetailPage from '@/components/Blog/BlogDetailPage';

interface PageProps {
  // Next.js expects this property to be a Promise
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  // Await the promise to get the actual params object
  const { id } = await params;
  return <BlogDetailPage id={id} />;
}
