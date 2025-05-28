// File: components/Events/EventCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import FaqModal from "@/components/Events/FaqModal";
import { EventData } from "@/app/events/page";
import styles from "./Events.module.css";

// Helper to normalize image paths (assumes files reside in public/images)
const resolveImagePath = (image?: string) => {
  if (!image) return "";
  if (image.startsWith("/images/")) return image;
  return `/images/${image.replace(/^uploads\//, "")}`;
};

export default function EventCard({ event }: { event: EventData }) {
  const datePart = event.date.split("T")[0];

  // fallback to old `time` if startTime/endTime missing
  const startRaw = event.startTime ?? (event as any).time;
  const endRaw   = event.endTime   ?? (event as any).time;

  const startDateTime = new Date(`${datePart}T${startRaw}`);
  const endDateTime   = new Date(`${datePart}T${endRaw}`);
  const now           = new Date();

  const isPastEvent = endDateTime < now;

  // Formatting
  const formattedDate  = new Date(event.date).toLocaleDateString();
  const formattedStart = startDateTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const formattedEnd = endDateTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Compute duration in hours to one decimal
  const durationMs  = endDateTime.getTime() - startDateTime.getTime();
  const durationHrs = Math.round((durationMs / 3600000) * 10) / 10;

  // Paid event booking state
  const [adultCount, setAdultCount]     = useState<number>(0);
  const [kidCount, setKidCount]         = useState<number>(0);
  const [payerName, setPayerName]       = useState<string>("");
  const [payerEmail, setPayerEmail]     = useState<string>("");
  const [showSummary, setShowSummary]   = useState<boolean>(false);

  // Free event RSVP state
  const [rsvpName, setRsvpName]         = useState<string>("");
  const [rsvpEmail, setRsvpEmail]       = useState<string>("");
  const [freeAdultCount, setFreeAdultCount] = useState<number>(0);
  const [freeKidCount, setFreeKidCount]     = useState<number>(0);

  // FAQ modal state
  const [showFaqs, setShowFaqs]         = useState<boolean>(false);

  const totalPrice = adultCount * event.adultPrice + kidCount * event.kidPrice;

  // Handle RSVP for free events.
const handleFreeRSVP = async () => {
  if (!rsvpName || !rsvpEmail || freeAdultCount <= 0) {
    toast.error("Please fill out your name, email, and enter at least one adult.");
    return;
  }
  const payload = {
    eventId:   event.id,
    name:      rsvpName,
    email:     rsvpEmail,
    adultCount: freeAdultCount,
    kidCount:   freeKidCount,
  };
  try {
    const res = await fetch(`/api/events/${event.id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json();
      toast.error("RSVP failed: " + errData.message);
      return;
    }
    toast.success("RSVP confirmed! Check your email for details.");
    // Clear RSVP form values
    setRsvpName("");
    setRsvpEmail("");
    setFreeAdultCount(0);
    setFreeKidCount(0);
  } catch (error: any) {
    console.error("Error submitting RSVP:", error);
    toast.error("Error submitting RSVP.");
  }
};

  // Handle paid event booking: validate inputs and show summary view.
  const handleBook = () => {
    if (adultCount === 0 || !payerName || !payerEmail) {
      toast.error("Please select at least one adult ticket and fill in your name and email.");
      return;
    }
    setShowSummary(true);
  };

  // Confirm and pay for paid event booking.
  const handleConfirmAndPay = async () => {
    const payload = {
      eventId:    event.id,
      name:       payerName,
      email:      payerEmail,
      adultCount,
      kidCount,
      totalPrice,
    };
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        toast.error("Booking failed: " + errData.message);
        return;
      }
      toast.success("Booking confirmed! Redirecting to payment...");
      setTimeout(() => {
        window.location.href = "https://www.clover.com/mock-payment";
      }, 1500);
    } catch (error: any) {
      console.error("Error submitting booking:", error);
      toast.error("Error submitting booking.");
    }
  };

  return (
    <div className={styles.eventCard}>
      <div className={styles.eventImageWrapper}>
        {event.image ? (
          <Image
            src={resolveImagePath(event.image)}
            alt={event.title}
            width={400}
            height={300}
            unoptimized
            className={styles.eventImage}
          />
        ) : event.isFree ? (
          <Image
            src="/images/free.svg"
            alt="Free Event"
            width={400}
            height={300}
            unoptimized
            className={styles.eventImage}
          />
        ) : (
          <div className={styles.noImage}>No Image</div>
        )}
      </div>

      <div className={styles.eventDetails}>
        <h2>{event.title}</h2>
        <p>{event.description}</p>

        <p>
          <strong>Location:</strong> {event.location}
        </p>
        <p>
          <strong>Date &amp; Time:</strong> {formattedDate} | {formattedStart}–{formattedEnd}
        </p>
        <p className={styles.duration}>
          <strong>Duration:</strong> {durationHrs} hrs
        </p>

        <p>
          <strong>Available Tickets:</strong> {event.availableTickets}
        </p>

        {event.kidPriceInfo && (
          <p className={styles.kidInfo}>
            <strong>Child Pricing:</strong> {event.kidPriceInfo}
          </p>
        )}

        <p>
          <strong>Price:</strong>{" "}
          {event.isFree
            ? "Free"
            : `Adults: $${event.adultPrice}${event.adultOnly ? " (Adults Only)" : ""}`}
        </p>
        {event.adultOnly && !event.isFree && (
          <p className={styles.adultsOnly}>Adults Only</p>
        )}

        {event.faqs && event.faqs.length > 0 && (
          <>
            <button
              className={styles.faqButton}
              onClick={() => setShowFaqs(true)}
            >
              View FAQs
            </button>
            {showFaqs && (
              <FaqModal faqs={event.faqs} onClose={() => setShowFaqs(false)} />
            )}
          </>
        )}

        {isPastEvent ? (
          <div className={styles.expiredMessage}>
            <p>This event has expired.</p>
          </div>
        ) : event.isFree ? (
          <div className={styles.bookingForm}>
            <h3>RSVP for Free Event</h3>
            <div className={styles.formGroup}>
              <label>Name</label>
              <input
                type="text"
                placeholder="Your Name"
                value={rsvpName}
                onChange={(e) => setRsvpName(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                placeholder="Your Email"
                value={rsvpEmail}
                onChange={(e) => setRsvpEmail(e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Number of Adults</label>
              <input
                type="number"
                min="0"
                value={freeAdultCount}
                onChange={(e) =>
                  setFreeAdultCount(parseInt(e.target.value) || 0)
                }
              />
            </div>
            {!event.adultOnly && (
              <div className={styles.formGroup}>
                <label>Number of Kids</label>
                <input
                  type="number"
                  min="0"
                  value={freeKidCount}
                  onChange={(e) =>
                    setFreeKidCount(parseInt(e.target.value) || 0)
                  }
                />
              </div>
            )}
            <button
              onClick={handleFreeRSVP}
              className={styles.bookingButton}
            >
              RSVP
            </button>
          </div>
        ) : (
          <>
            {!showSummary ? (
              <div className={styles.bookingForm}>
                <h3>Book Your Tickets</h3>
                <div className={styles.formGroup}>
                  <label>Adult Tickets</label>
                  <input
                    type="number"
                    min="0"
                    value={adultCount}
                    onChange={(e) =>
                      setAdultCount(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                {!event.adultOnly && (
                  <div className={styles.formGroup}>
                    <label>Child Tickets</label>
                    <input
                      type="number"
                      min="0"
                      value={kidCount}
                      onChange={(e) =>
                        setKidCount(parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                )}
                <div className={styles.formGroup}>
                  <label>Your Name</label>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Your Email</label>
                  <input
                    type="email"
                    placeholder="Your Email"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                  />
                </div>
                <div className={styles.totalPrice}>
                  Total: ${totalPrice.toFixed(2)}
                </div>
                <button onClick={handleBook} className={styles.bookingButton}>
                  Book
                </button>
              </div>
            ) : (
              <div className={styles.bookingForm}>
                <h3>Booking Summary</h3>
                <p>
                  <strong>Tickets:</strong> {adultCount} Adult
                  {adultCount !== 1 ? "s" : ""}
                  {!event.adultOnly &&
                    `, ${kidCount} Child${kidCount !== 1 ? "ren" : ""}`}
                </p>
                <p>
                  <strong>Total:</strong> ${totalPrice.toFixed(2)}
                </p>
                <p>
                  <strong>Name:</strong> {payerName}
                </p>
                <p>
                  <strong>Email:</strong> {payerEmail}
                </p>
                <button
                  onClick={handleConfirmAndPay}
                  className={styles.bookingButton}
                >
                  Confirm and Pay
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
