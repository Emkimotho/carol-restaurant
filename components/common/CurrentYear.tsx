// File: components/common/CurrentYear.tsx
import React from "react";

const CurrentYear: React.FC = () => {
  return <> {new Date().getFullYear()} </>;
};

export default CurrentYear;
