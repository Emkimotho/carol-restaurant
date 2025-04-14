// app/clover/page.tsx
"use client"; // Add this at the top to mark this page as a client component

import dynamic from 'next/dynamic';

// Dynamically import the Clover component with SSR disabled
const Clover = dynamic(() => import('@/components/clover/Clover'), { ssr: false });

export default function CloverPage() {
  return (
    <div>
      <Clover />
    </div>
  );
}
