// File: components/MenuTimingBar/MenuTimingBar.tsx
"use client";

import React, { useState, useEffect, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";

import { OrderContext }    from "@/contexts/OrderContext";
import { useOpeningHours } from "@/contexts/OpeningHoursContext";

import styles from "./MenuTimingBar.module.css";

export default function MenuTimingBar() {
  const router                   = useRouter();
  const { order, clearSchedule } = useContext(OrderContext)!;
  const { isOpen }               = useOpeningHours();
  const { schedule }             = order;

  const [showSheet, setShowSheet] = useState(false);
  const [, forceTick]             = useState(0);     // re-render trigger
  const [rippling, setRippling]   = useState(false); // tap ripple

  /* ── friendly status line ────────────────────────── */
  const statusLine = useCallback(() => {
    if (!schedule) {
      return (
        <>
          <span className={styles.asapWord}>ASAP</span> • Ready now
        </>
      );
    }
    const d = new Date(schedule);
    return d.toLocaleString([], {
      weekday: "short",
      month:   "short",
      day:     "numeric",
      hour:    "2-digit",
      minute:  "2-digit",
    });
  }, [schedule]);

  /* tick every minute when scheduled */
  useEffect(() => {
    if (!schedule) return;
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [schedule]);

  /* ── helpers ─────────────────────────────────────── */
  const openSheet   = () => { setShowSheet(true); triggerRipple(); };
  const closeSheet  = () => setShowSheet(false);
  const chooseASAP  = () => { if (isOpen) { clearSchedule(); closeSheet(); } };
  const chooseSched = () => { clearSchedule(); closeSheet(); router.push("/schedule-order"); };

  const triggerRipple = () => {
    setRippling(true);
    setTimeout(() => setRippling(false), 450);
  };

  const actionLabel = schedule ? "Edit time" : "Schedule for later";

  /* ── render ───────────────────────────────────────── */
  return (
    <>
      {/* ▸ fixed bar */}
      <div className={styles.timingBar}>
        <button
          className={`${styles.barButton} ${rippling ? styles.ripple : ""}`}
          onClick={openSheet}
          aria-label={actionLabel}
        >
          <span className={styles.clockIcon} aria-hidden />
          <span className={styles.barText} aria-live="polite">
            Your order&nbsp;{schedule ? "is scheduled for " : "is set to "}
            {statusLine()}
          </span>
          <span className={styles.barAction}>{actionLabel}</span>
        </button>
      </div>

      {/* ▸ bottom sheet */}
      {showSheet && (
        <div className={styles.overlay} onClick={closeSheet}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.sheetTitle}>Choose a time</h3>

            {!isOpen && (
              <p className={styles.closedNote}>
                We’re closed right now, but you can still queue your order for later.
              </p>
            )}

            <div className={styles.sheetBtns}>
              <button
                className={styles.btnPrimary}
                disabled={!isOpen}
                onClick={chooseASAP}
              >
                Cook it now 🔥
              </button>
              <button className={styles.btnOutline} onClick={chooseSched}>
                Pick a time 📅
              </button>
            </div>

            <button className={styles.btnClose} aria-label="Cancel" onClick={closeSheet}>
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
