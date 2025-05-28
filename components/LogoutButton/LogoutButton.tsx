// File: components/LogoutButton/LogoutButton.tsx
"use client";

import { signOut } from "next-auth/react";
import React from "react";

interface Props {
  className?: string;
  label?: string;
}

const LogoutButton: React.FC<Props> = ({ className = "", label = "Logout" }) => {
  return (
    <button
      className={className}
      onClick={() => signOut({ callbackUrl: "/login" })} // ← clear session & cookie
    >
      {label}
    </button>
  );
};

export default LogoutButton;
