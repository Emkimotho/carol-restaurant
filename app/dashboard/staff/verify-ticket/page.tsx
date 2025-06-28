// File: app/dashboard/staff/verify-ticket/page.tsx
"use client";

import React from "react";
import VerifyTicketForm from "@/components/Staff/VerifyTicketForm";

export default function VerifyTicketPage() {
  return (
    <div style={{ padding: "1rem" }}>
      <h1>Verify Tickets</h1>
      <VerifyTicketForm />
    </div>
  );
}
