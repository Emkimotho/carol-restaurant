// pages/blog/[id].tsx
import { useParams } from 'next/navigation';
import BlogDetailPage from '@/components/Blog/BlogDetailPage';

interface PageProps {
  params: {
    id: string;
  };
}

export default function BlogDetail({ params }: PageProps) {
  // The id is available in params from the URL (e.g. /blog/1)
  return <BlogDetailPage id={params.id} />;
}
