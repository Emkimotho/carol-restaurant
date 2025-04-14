// components/clover/Clover.tsx
'use client';

import React, { useEffect, useState } from 'react';

interface CloverData {
  elements?: any[];
  [key: string]: any;
}

export default function Clover() {
  const [data, setData] = useState<CloverData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCloverData() {
      try {
        const res = await fetch('/api/clover');
        console.log('API call status:', res.status);
        if (!res.ok) {
          const errorData = await res.json();
          console.error('API error:', errorData);
          setError(JSON.stringify(errorData));
        } else {
          const jsonData = await res.json();
          console.log('Fetched data:', jsonData);
          setData(jsonData);
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError('Error fetching Clover data');
      } finally {
        setLoading(false);
      }
    }
    fetchCloverData();
  }, []);

  if (loading) return <div>Loading Clover data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Clover Data</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
