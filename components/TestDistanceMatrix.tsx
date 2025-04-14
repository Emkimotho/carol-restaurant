"use client";

import React, { useState } from "react";

const TestDistanceMatrix: React.FC = () => {
  const [result, setResult] = useState<any>(null);

  const testApi = async () => {
    try {
      const response = await fetch("/api/external/distance-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: "20025 Mount Aetna Road, Hagerstown, MD 21742",
          destination: "12805 Little Elliott Dr, Hagerstown, MD 21742",
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Test API error:", error);
    }
  };

  return (
    <div>
      <h2>Test Distance Matrix API</h2>
      <button onClick={testApi}>Test API</button>
      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

export default TestDistanceMatrix;
