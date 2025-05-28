"use client";

/*  -----------------------------------------------------------------------
    SubmissionTotals
    -----------------------------------------------------------------------
      • Generic totals button + modal for any array of submissions
      • Accepts { eventId, eventTitle, adultCount, kidCount }[]
      • Renders a “Totals” button only when `visible` is true
------------------------------------------------------------------------- */

import React, { useMemo, useState } from "react";
import styles from "./EventManager.module.css";

interface Submission {
  eventId: string;
  eventTitle: string;
  adultCount: number;
  kidCount: number;
}

interface Props {
  /** Array of submissions (bookings or RSVPs) */
  data: Submission[];
  /** Only show the button when on the matching tab */
  visible: boolean;
  /** Text for the button */
  buttonLabel: string;
  /** Title for the modal */
  modalTitle: string;
}

const SubmissionTotals: React.FC<Props> = ({
  data,
  visible,
  buttonLabel,
  modalTitle,
}) => {
  // Group & sum adults/kids per event
  const summaries = useMemo(() => {
    const map: Record<
      string,
      { eventId: string; eventTitle: string; adultCount: number; kidCount: number }
    > = {};
    for (const s of data) {
      if (!map[s.eventId]) {
        map[s.eventId] = {
          eventId:    s.eventId,
          eventTitle: s.eventTitle,
          adultCount: 0,
          kidCount:   0,
        };
      }
      map[s.eventId].adultCount += s.adultCount;
      map[s.eventId].kidCount   += s.kidCount;
    }
    return Object.values(map);
  }, [data]);

  const [open, setOpen] = useState(false);
  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        className={styles.totalsBtn}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </button>

      {open && (
        <div className={styles.modalOverlay} onClick={() => setOpen(false)}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h4 className={styles.modalHeading}>{modalTitle}</h4>
            {summaries.length === 0 ? (
              <p>No submissions yet.</p>
            ) : (
              <ul className={styles.modalList}>
                {summaries.map((s) => (
                  <li key={s.eventId} className={styles.modalItem}>
                    <strong>{s.eventTitle}</strong>
                    <span>
                      {s.adultCount} Adult{s.adultCount !== 1 && "s"},{" "}
                      {s.kidCount} Kid{s.kidCount !== 1 && "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SubmissionTotals;
