"use client";

/*  -----------------------------------------------------------------------
    Card component for displaying one Booking or RSVP.
    Re-usable in EventManager submissions view.
------------------------------------------------------------------------- */

import React from "react";
import { pretty, ET } from "@/lib/time";
import styles from "./EventManager.module.css";

interface SubmissionCardProps {
  id: string;
  eventTitle: string;
  name: string;
  email?: string;
  createdAt: string;
  adultCount: number;
  kidCount: number;
  totalPrice?: number;            // bookings only
  onDelete: (id: string) => void; // delete handler
}

const SubmissionCard: React.FC<SubmissionCardProps> = ({
  id,
  eventTitle,
  name,
  email,
  createdAt,
  adultCount,
  kidCount,
  totalPrice,
  onDelete,
}) => {
  return (
    <div className={styles.submissionCard}>
      <div className={styles.cardInfo}>
        <strong>{eventTitle}</strong>
        <div className={styles.cardMeta}>
          <div>{name}</div>
          {email && <div className={styles.cardEmail}>{email}</div>}
          <div>
            {pretty(ET(createdAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
        </div>
        <div className={styles.cardCounts}>
          {adultCount} Adult{adultCount !== 1 && "s"}
          {", "}
          {kidCount} Kid{kidCount !== 1 && "s"}
          {typeof totalPrice === "number" && (
            <>
              {" — $"}
              {totalPrice.toFixed(2)}
            </>
          )}
        </div>
      </div>

      <button
        className={styles.deleteButton}
        title="Delete submission"
        onClick={() => onDelete(id)}
      >
        ✕
      </button>
    </div>
  );
};

export default SubmissionCard;
