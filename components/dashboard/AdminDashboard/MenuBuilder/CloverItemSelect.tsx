// File: components/dashboard/AdminDashboard/MenuBuilder/CloverItemSelect.tsx

'use client';

import React, { useEffect, useState } from 'react';

interface CloverItem {
  id: string;
  name: string;
  // Add any additional fields as needed
}

interface CloverItemSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const CloverItemSelect: React.FC<CloverItemSelectProps> = ({ value, onChange }) => {
  const [items, setItems] = useState<CloverItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch('/api/clover/items');
        if (!res.ok) {
          throw new Error('Error fetching Clover items');
        }
        const data = await res.json();
        // Adjust based on your Clover API response structure
        setItems(data.elements || data.items || []);
      } catch (err: any) {
        setError(err.message || 'Error fetching items');
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  if (loading) return <p>Loading Clover items...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <label htmlFor="cloverItemId">Clover Item:</label>
      <select
        id="cloverItemId"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- Select Clover Item (optional) --</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} ({item.id})
          </option>
        ))}
      </select>
    </div>
  );
};

export default CloverItemSelect;
