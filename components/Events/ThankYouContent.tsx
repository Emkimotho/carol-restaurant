// File: components/Events/ThankYouContent.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./ThankYouContent.module.css";

interface BookingDetail {
  id: string;
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
  totalPrice?: number;
  status: string; // e.g. "CONFIRMED", etc.
  event: {
    title: string;
    date: string;     // ISO string
    startTime: string;
    location: string;
  };
}

interface TicketInfo {
  code: string;
  status: string;
  redeemedAt: string | null;
}

interface ThankYouContentProps {
  bookingId: string | null;
}

export default function ThankYouContent({ bookingId }: ThankYouContentProps) {
  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState("");
  const [tickets, setTickets] = useState<TicketInfo[] | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Helper to validate basic email format
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // 1) Fetch booking details on mount (to display event info etc.)
  useEffect(() => {
    if (!bookingId) return;
    const controller = new AbortController();
    async function fetchBooking() {
      setBookingLoading(true);
      setBookingError(null);
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: "GET",
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const msg = data?.message || `Failed to fetch booking (${res.status})`;
          setBookingError(msg);
          setBookingDetail(null);
        } else {
          const data = await res.json();
          // Expect shape: { booking: { id, name, email, adultCount, kidCount, status, event: { title, date, startTime, location } } }
          // Or adjust according to your API.
          // E.g., if your endpoint returns { booking, event }, adapt accordingly.
          // Here we assume data.booking exists:
          if (data.booking) {
            setBookingDetail(data.booking as BookingDetail);
          } else if (data.id) {
            // maybe the endpoint returns booking fields at top level
            setBookingDetail(data as BookingDetail);
          } else {
            setBookingError("Unexpected booking response format.");
            setBookingDetail(null);
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Error fetching booking detail:", err);
          setBookingError("Server error fetching booking.");
        }
        setBookingDetail(null);
      } finally {
        setBookingLoading(false);
      }
    }
    fetchBooking();
    return () => {
      controller.abort();
    };
  }, [bookingId]);

  // 2) Verify & fetch tickets
  const handleVerify = async () => {
    setVerifyError(null);
    setTickets(null);
    setShowResults(false);

    if (!bookingId) {
      setVerifyError("Booking reference is missing.");
      return;
    }
    const email = emailInput.trim();
    if (!email) {
      setVerifyError("Please enter your email.");
      return;
    }
    if (!isValidEmail(email)) {
      setVerifyError("Please enter a valid email address.");
      return;
    }

    setLoadingTickets(true);
    try {
      const res = await fetch(
        `/api/bookings/${bookingId}/tickets?email=${encodeURIComponent(email)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.message || `Failed to fetch tickets (${res.status})`);
        setTickets(null);
      } else if (Array.isArray(data.tickets)) {
        setTickets(data.tickets);
        setVerifyError(null);
      } else {
        setVerifyError("Unexpected response format from tickets API.");
        setTickets(null);
      }
      setShowResults(true);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      setVerifyError("Server error fetching tickets.");
      setTickets(null);
      setShowResults(true);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleReset = () => {
    setEmailInput("");
    setTickets(null);
    setVerifyError(null);
    setShowResults(false);
    setLoadingTickets(false);
  };

  // 3) Render
  // If no bookingId at all:
  if (!bookingId) {
    return (
      <p className={`${styles.noBookingInfo} ${styles.marginTop}`}>
        Thank you for your purchase. We couldn’t detect a booking reference in the URL,
        but your tickets have been emailed to you. If you wish to view them now, check your email inbox.
      </p>
    );
  }

  // While booking details loading:
  if (bookingLoading) {
    return <p className={styles.loadingText}>Loading booking details…</p>;
  }
  // If error fetching booking:
  if (bookingError) {
    return (
      <div className={styles.errorText}>
        <p>Unable to load booking details: {bookingError}</p>
        <p>
          If your payment went through, you should have received an email. Otherwise,
          please contact support with Booking ID <strong>{bookingId}</strong>.
        </p>
      </div>
    );
  }
  // bookingDetail now available or null if unexpected
  if (!bookingDetail) {
    return (
      <div className={styles.errorText}>
        <p>Booking information not available.</p>
        <p>
          Please check your email for confirmation or contact support with Booking ID <strong>{bookingId}</strong>.
        </p>
      </div>
    );
  }

  // Destructure for ease
  const {
    name: bookingName,
    event: { title: eventTitle, date: eventDateISO, startTime, location },
    status: bookingStatus,
  } = bookingDetail;

  // Format event date/time
  const dateObj = new Date(eventDateISO);
  const formattedDate = dateObj.toLocaleDateString();
  const formattedWhen = `${formattedDate} at ${startTime}`;

  // Depending on status you might show different message
  // Usually at success URL, payment was successful => status is CONFIRMED
  const isConfirmed = bookingStatus === "CONFIRMED";

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.primaryText}>Thank you, {bookingName}!</h2>
      <p className={styles.subText}>
        Your booking for <strong>{eventTitle}</strong> on <strong>{formattedWhen}</strong> at <strong>{location}</strong> was successful.
      </p>
      {!isConfirmed && (
        <p className={styles.warningText}>
          Note: Booking status is &ldquo;{bookingStatus}&rdquo;. If you just completed payment, status may take a moment to update; otherwise contact support.
        </p>
      )}
      <p className={styles.infoText}>
        A confirmation email with your ticket{bookingDetail.adultCount + bookingDetail.kidCount > 1 ? "s" : ""} has been sent to <strong>{bookingDetail.email}</strong>.
      </p>
      <p className={styles.infoText}>
        If you don’t see it soon, check your spam folder or contact support with Booking ID <strong>{bookingId}</strong>.
      </p>

      {/* Verify & Show Tickets */}
      {!showResults && (
        <div className={styles.verifyBox}>
          <h3 className={styles.verifyHeading}>View Your Tickets Now</h3>
          <p className={styles.verifyText}>
            Enter the email you used for this booking to view your ticket code{bookingDetail.adultCount + bookingDetail.kidCount > 1 ? "s" : ""} immediately.
          </p>
          <input
            type="email"
            placeholder="you@example.com"
            className={styles.emailInput}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <button
            type="button"
            className={styles.verifyButton}
            onClick={handleVerify}
            disabled={loadingTickets}
          >
            {loadingTickets ? "Verifying…" : "Verify & Show Tickets"}
          </button>
          {verifyError && <p className={styles.errorText}>{verifyError}</p>}
        </div>
      )}

      {showResults && (
        <div className={styles.ticketsSection}>
          <h3 className={styles.ticketsHeading}>Your Tickets</h3>
          {loadingTickets ? (
            <p className={styles.loadingText}>Loading tickets…</p>
          ) : verifyError && !tickets ? (
            <p className={styles.errorText}>{verifyError}</p>
          ) : tickets && tickets.length > 0 ? (
            <ul className={styles.ticketList}>
              {tickets.map((t) => (
                <li key={t.code} className={styles.ticketItem}>
                  <code className={styles.ticketCode}>{t.code}</code>{" "}
                  <span className={styles.statusText}>
                    Status: <strong>{t.status}</strong>
                    {t.redeemedAt
                      ? `, Redeemed at ${new Date(t.redeemedAt).toLocaleString()}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.noTicketsText}>
              No tickets found for this booking.
            </p>
          )}
          <button
            type="button"
            className={styles.backButton}
            onClick={handleReset}
          >
            Lookup another email
          </button>
        </div>
      )}
    </div>
  );
}
