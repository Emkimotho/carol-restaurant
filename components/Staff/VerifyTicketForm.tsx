"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import styles from "./VerifyTicketForm.module.css";

interface TicketInfo {
  id: string;
  purchaser: string;
  purchaserEmail: string;
  event: {
    title: string;
    date: string; // ISO string
    startTime: string;
    location: string;
  };
  status: string; // expected lowercase: "issued", "redeemed", etc.
  redeemedAt: string | null;
  redeemedBy: string | null;
}

/**
 * VerifyTicketForm: staff enters a code, clicks “Lookup” to fetch details,
 * confirms purchaser name, then clicks “Redeem” to mark it redeemed.
 * After redeem, shows redeemed info and “Redeem another” button.
 */
export default function VerifyTicketForm() {
  const [code, setCode] = useState("");
  // Stages: "initial" -> before lookup
  //         "lookupSuccess" -> after lookup (ticket info shown), before redeem or if not issuable
  //         "redeemed" -> after successful redeem
  const [stage, setStage] = useState<"initial" | "lookupSuccess" | "redeemed">("initial");
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [loadingRedeem, setLoadingRedeem] = useState(false);
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Whenever code input changes, reset to initial stage
  useEffect(() => {
    if (stage !== "initial") {
      setStage("initial");
      setTicket(null);
      setConfirmed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Normalize code: strip non-alphanumeric, uppercase
  const normalizeCode = (raw: string) => {
    return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  };

  // 1) Lookup handler
  const handleLookup = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Please enter a ticket code to look up.");
      return;
    }
    const normalized = normalizeCode(trimmed);
    if (normalized.length === 0) {
      toast.error("Ticket code appears invalid after normalization.");
      return;
    }

    setLoadingLookup(true);
    setTicket(null);
    setConfirmed(false);
    try {
      const res = await fetch(`/api/tickets/lookup/${encodeURIComponent(normalized)}`, {
        method: "GET",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Ticket not found or cannot lookup.");
        return;
      }
      // Expect data: { id, code, status, purchaser, purchaserEmail, event: {...}, redeemedAt, redeemedBy }
      // Ensure status is lowercase:
      const statusLower = (data.status || "").toString().toLowerCase();

      const info: TicketInfo = {
        id: data.id ?? data.code, // if backend returns id field, use it; otherwise fallback to code
        purchaser: data.purchaser,
        purchaserEmail: data.purchaserEmail,
        event: data.event,
        status: statusLower,
        redeemedAt: data.redeemedAt ?? null,
        redeemedBy: data.redeemedBy ?? null,
      };

      if (statusLower !== "issued") {
        if (statusLower === "redeemed" && info.redeemedAt) {
          toast.error(`Ticket already redeemed at ${new Date(info.redeemedAt).toLocaleString()}`);
        } else {
          toast.error(`Cannot redeem ticket with status "${info.status}".`);
        }
      }
      setTicket(info);
      setStage("lookupSuccess");
    } catch (err: any) {
      console.error("Lookup error", err);
      toast.error("Server error during lookup.");
    } finally {
      setLoadingLookup(false);
    }
  };

  // 2) Redeem handler
  const handleRedeem = async () => {
    if (!ticket) return;
    if (!confirmed) {
      toast.error("Please confirm the purchaser’s name matches before redeeming.");
      return;
    }
    const normalized = normalizeCode(code.trim());
    setLoadingRedeem(true);

    try {
      const res = await fetch("/api/tickets/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to redeem ticket");
        return;
      }
      // Expect data: { purchaser, purchaserEmail, event: {...}, redeemedAt, redeemedBy }
      const redeemedInfo: TicketInfo = {
        id: ticket.id,
        purchaser: data.purchaser || ticket.purchaser,
        purchaserEmail: data.purchaserEmail || ticket.purchaserEmail,
        event: data.event || ticket.event,
        status: "redeemed",
        redeemedAt: data.redeemedAt,
        redeemedBy: data.redeemedBy ?? null,
      };
      setTicket(redeemedInfo);
      setStage("redeemed");
      toast.success("Ticket redeemed successfully");
    } catch (err: any) {
      console.error("Redeem error", err);
      toast.error("Server error redeeming ticket");
    } finally {
      setLoadingRedeem(false);
    }
  };

  // Reset to initial for another lookup
  const handleReset = () => {
    setCode("");
    setTicket(null);
    setStage("initial");
    setConfirmed(false);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Verify &amp; Redeem Ticket</h1>

      {stage === "initial" && (
        <div className={styles.container}>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
          >
            <div className={styles.formGroup}>
              <label htmlFor="code" className={styles.label}>
                Ticket Code
              </label>
              <input
                id="code"
                className={styles.input}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter ticket code"
                required
              />
            </div>
            <button
              type="submit"
              className={styles.button}
              disabled={!code.trim() || loadingLookup}
            >
              {loadingLookup ? "Looking up…" : "Lookup Ticket"}
            </button>
          </form>
        </div>
      )}

      {stage === "lookupSuccess" && ticket && (
        <div className={styles.container}>
          <h2 className={styles.resultHeading}>Ticket Details</h2>
          <div className={styles.resultItem}>
            <strong>Purchaser:</strong> {ticket.purchaser}
          </div>
          <div className={styles.resultItem}>
            <strong>Email:</strong> {ticket.purchaserEmail}
          </div>
          <div className={styles.resultItem}>
            <strong>Event:</strong> {ticket.event.title}
          </div>
          <div className={styles.resultItem}>
            <strong>Date &amp; Time:</strong>{" "}
            {new Date(ticket.event.date).toLocaleDateString()} @{" "}
            {ticket.event.startTime}
          </div>
          <div className={styles.resultItem}>
            <strong>Location:</strong> {ticket.event.location}
          </div>
          <div className={styles.resultItem}>
            <strong>Status:</strong>{" "}
            <span
              style={{
                color:
                  ticket.status === "issued"
                    ? "var(--primary-color)"
                    : ticket.status === "redeemed"
                    ? "var(--gray)"
                    : "var(--gray)",
              }}
            >
              {ticket.status}
            </span>
          </div>
          {ticket.status === "redeemed" && ticket.redeemedAt && (
            <div className={styles.resultItem}>
              <strong>Redeemed At:</strong> {new Date(ticket.redeemedAt).toLocaleString()}
            </div>
          )}
          {ticket.status === "redeemed" && ticket.redeemedBy && (
            <div className={styles.resultItem}>
              <strong>Redeemed By:</strong> {ticket.redeemedBy}
            </div>
          )}

          {ticket.status === "issued" ? (
            <>
              <div className={styles.formGroup}>
                <div className={styles.checkboxGroup}>
                  <input
                    id="confirm"
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <label htmlFor="confirm" className={styles.checkboxLabel}>
                    I confirm the purchaser’s name matches.
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className={styles.button}
                  onClick={handleRedeem}
                  disabled={!confirmed || loadingRedeem}
                >
                  {loadingRedeem ? "Redeeming…" : "Redeem Ticket"}
                </button>
                <button
                  type="button"
                  className={`${styles.button} ${styles.secondaryButton}`}
                  onClick={handleReset}
                  disabled={loadingRedeem}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            // Already redeemed or other status: allow lookup another
            <div style={{ marginTop: "1rem" }}>
              <button type="button" className={styles.button} onClick={handleReset}>
                Lookup Another Ticket
              </button>
            </div>
          )}
        </div>
      )}

      {stage === "redeemed" && ticket && (
        <div className={styles.resultContainer}>
          <h2 className={styles.resultHeading}>Ticket Redeemed</h2>
          <div className={styles.resultItem}>
            <strong>Purchaser:</strong> {ticket.purchaser}
          </div>
          <div className={styles.resultItem}>
            <strong>Email:</strong> {ticket.purchaserEmail}
          </div>
          <div className={styles.resultItem}>
            <strong>Event:</strong> {ticket.event.title}
          </div>
          <div className={styles.resultItem}>
            <strong>Date &amp; Time:</strong>{" "}
            {new Date(ticket.event.date).toLocaleDateString()} @{" "}
            {ticket.event.startTime}
          </div>
          <div className={styles.resultItem}>
            <strong>Location:</strong> {ticket.event.location}
          </div>
          <div className={styles.resultItem}>
            <strong>Redeemed At:</strong>{" "}
            {new Date(ticket.redeemedAt || "").toLocaleString()}
          </div>
          {ticket.redeemedBy && (
            <div className={styles.resultItem}>
              <strong>Redeemed By:</strong> {ticket.redeemedBy}
            </div>
          )}
          <div style={{ marginTop: "1rem" }}>
            <button type="button" className={styles.button} onClick={handleReset}>
              Redeem Another Ticket
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
