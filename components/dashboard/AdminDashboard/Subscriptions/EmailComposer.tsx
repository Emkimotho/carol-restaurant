// File: components/dashboard/AdminDashboard/Subscriptions/EmailComposer.tsx
"use client";

import React, { useState } from "react";
import styles from "./EmailComposer.module.css";
import { toast } from "react-toastify";

const EmailComposer: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !bodyHtml.trim()) {
      toast.error("Subject and body are required.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/send-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyHtml }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Emails sent successfully.");
        setSubject("");
        setBodyHtml("");
      } else {
        toast.error(data.error || "Failed to send emails.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Unexpected error while sending.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>Compose Email to Subscribers</h2>
      <form onSubmit={handleSend}>
        <div className={styles.field}>
          <label>Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label>HTML Body:</label>
          <textarea
            rows={8}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            required
            placeholder="You can paste formatted HTML here."
          />
        </div>

        <button type="submit" disabled={sending} className="btn">
          {sending ? "Sending…" : "Send to All Subscribers"}
        </button>
      </form>
    </div>
  );
};

export default EmailComposer;
