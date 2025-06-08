// File: components/SubscribeForm.tsx
"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";

const SubscribeForm: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim().includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Thank you for subscribing!");
        setEmail("");
      } else {
        toast.error(data.error || "Subscription failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "2rem auto" }}>
      <label htmlFor="email">Subscribe with your email:</label>
      <input
        id="email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{
          width: "100%",
          padding: "0.5rem",
          border: "1px solid var(--border-color-dark)",
          borderRadius: "4px",
          margin: "0.5rem 0 1rem",
        }}
      />
      <button type="submit" disabled={loading} className="btn">
        {loading ? "Submitting…" : "Subscribe"}
      </button>
    </form>
  );
};

export default SubscribeForm;
