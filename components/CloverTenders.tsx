// File: components/CloverTenders.tsx

"use client";

import React from "react";

export interface CloverTender {
  id: string;
  labelKey: string;
  name: string;
  description?: string;
}

interface CloverTendersProps {
  tenders: CloverTender[];
}

const CloverTenders: React.FC<CloverTendersProps> = ({ tenders }) => {
  return (
    <div>
      <h1>Clover Tenders</h1>
      {tenders.length === 0 ? (
        <p>No tenders found.</p>
      ) : (
        <ul>
          {tenders.map((tender) => (
            <li key={tender.id} style={{ marginBottom: "1rem" }}>
              <strong>{tender.name}</strong> (ID: {tender.id}) - Label: {tender.labelKey}
              {tender.description && <p>{tender.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CloverTenders;
