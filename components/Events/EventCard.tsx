// File: components/Events/EventCard.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import FaqModal from "@/components/Events/FaqModal";
import { EventData } from "@/app/events/page";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";
import styles from "./Events.module.css";

interface BookingInitResponse {
  bookingId?: string;
  message?: string;
}
interface RsvpResponse {
  reserved?: { adultCount: number; kidCount: number };
  message?: string;
}

// Resolve the best image source
const resolveImageSrc = (event: EventData): string => {
  // 1) If you've stored the full secure URL, use it:
  if ((event as any).imageUrl) {
    return (event as any).imageUrl;
  }
  // 2) Otherwise if you have a Cloudinary public ID, generate a resized URL
  const publicId = (event as any).cloudinaryPublicId as string | undefined;
  if (publicId) {
    return getCloudinaryImageUrl(publicId, 400, 300);
  }
  // 3) Legacy local‐upload fallback
  if ((event as any).image?.startsWith("/images/")) {
    return (event as any).image;
  }
  if ((event as any).image) {
    return `/images/${(event as any).image.replace(/^uploads\//, "")}`;
  }
  // 4) No image at all
  return "";
};

export default function EventCard({ event }: { event: EventData }) {
  const router = useRouter();

  // ── Parse & format date/time ────────────────────────────────────────────────
  const [datePart] = event.date.split("T");
  const startRaw = event.startTime ?? (event as any).time;
  const endRaw = event.endTime ?? (event as any).time;
  const startDateTime = new Date(`${datePart}T${startRaw}`);
  const endDateTime = new Date(`${datePart}T${endRaw}`);
  const now = new Date();
  const isPastEvent = endDateTime < now;

  const formattedDate = new Date(event.date).toLocaleDateString();
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

  const durationMs = endDateTime.getTime() - startDateTime.getTime();
  const durationHrs = Math.round((durationMs / 3_600_000) * 10) / 10;

  // ── Booking state ────────────────────────────────────────────────────────────
  const [adultCount, setAdultCount] = useState(0);
  const [kidCount, setKidCount] = useState(0);
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [loadingBooking, setLoadingBooking] = useState(false);

  // ── RSVP (free event) state ─────────────────────────────────────────────────
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpEmail, setRsvpEmail] = useState("");
  const [freeAdultCount, setFreeAdultCount] = useState(0);
  const [freeKidCount, setFreeKidCount] = useState(0);
  const [reserved, setReserved] = useState<{ adultCount: number; kidCount: number } | null>(null);
  const [loadingRsvp, setLoadingRsvp] = useState(false);

  // ── FAQ modal ───────────────────────────────────────────────────────────────
  const [showFaqs, setShowFaqs] = useState(false);

  const totalPrice = adultCount * event.adultPrice + kidCount * event.kidPrice;
  const totalFreeTickets = freeAdultCount + freeKidCount;

  const clampNonNegative = (v: number) => (v >= 0 ? v : 0);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleFreeRSVP = async () => {
    if (loadingRsvp) return;
    const name = rsvpName.trim();
    const email = rsvpEmail.trim();
    if (!name || !email || totalFreeTickets <= 0) {
      toast.error("Please fill name, email, and select at least one ticket.");
      return;
    }
    if (isPastEvent) {
      toast.error("This event has passed; RSVP not allowed.");
      return;
    }
    if (!event.isFree) {
      toast.error("This event requires payment; RSVP not allowed.");
      return;
    }
    if (typeof event.availableTickets === "number" && event.availableTickets < totalFreeTickets) {
      toast.error("Not enough tickets available for RSVP.");
      return;
    }

    setLoadingRsvp(true);
    try {
      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, adultCount: freeAdultCount, kidCount: freeKidCount }),
      });
      const data = (await res.json()) as RsvpResponse;
      if (!res.ok) {
        toast.error("RSVP failed: " + (data.message ?? "Unknown error"));
      } else {
        const reservedCounts = data.reserved ?? { adultCount: freeAdultCount, kidCount: freeKidCount };
        setReserved(reservedCounts);
        toast.success("RSVP confirmed! Thank you.");
        setRsvpName("");
        setRsvpEmail("");
        setFreeAdultCount(0);
        setFreeKidCount(0);
      }
    } catch (err: any) {
      console.error("Error submitting RSVP:", err);
      toast.error("Error submitting RSVP.");
    } finally {
      setLoadingRsvp(false);
    }
  };

  const handleBook = async () => {
    if (loadingBooking) return;
    const name = payerName.trim();
    const email = payerEmail.trim();
    if (!name || !email || adultCount + kidCount <= 0) {
      toast.error("Please select tickets and fill out name and email.");
      return;
    }
    if (isPastEvent) {
      toast.error("This event has passed; booking not allowed.");
      return;
    }
    if (typeof event.availableTickets === "number" && event.availableTickets < adultCount + kidCount) {
      toast.error("Not enough tickets available.");
      return;
    }

    setLoadingBooking(true);
    try {
      const res = await fetch(`/api/events/${event.id}/booking-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, adultCount, kidCount }),
      });
      const data = (await res.json()) as BookingInitResponse;
      if (!res.ok) {
        toast.error("Booking failed: " + (data.message ?? "Unknown error"));
      } else if (data.bookingId) {
        toast.success("Booking created! Redirecting…");
        router.push(`/events/summary/${data.bookingId}`);
      } else {
        toast.error("Booking initialization did not return an ID.");
      }
    } catch (err: any) {
      console.error("Error initializing booking:", err);
      toast.error("Error initializing booking.");
    } finally {
      setLoadingBooking(false);
    }
  };

  // ── Thank-you panel for free events ─────────────────────────────────────────
  if (event.isFree && reserved) {
    return (
      <div className={styles.thankYouPanel}>
        <h3>Thank you for RSVPing!</h3>
        <p>
          We have reserved {reserved.adultCount} adult ticket
          {reserved.adultCount !== 1 ? "s" : ""}
          {reserved.kidCount > 0 &&
            ` and ${reserved.kidCount} kid ticket${reserved.kidCount !== 1 ? "s" : ""}`}.
        </p>
        <p>Please check your email for details. No ticket codes needed for free events.</p>
      </div>
    );
  }

  // ── Main Event Card ────────────────────────────────────────────────────────
  return (
    <div className={styles.eventCard}>
      {/* Image */}
      <div className={styles.eventImageWrapper}>
        {resolveImageSrc(event) ? (
          <Image
            src={resolveImageSrc(event)}
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

      {/* Details */}
      <div className={styles.eventDetails}>
        <h2>{event.title}</h2>
        <p>{event.description}</p>
        <p><strong>Location:</strong> {event.location}</p>
        <p>
          <strong>Date &amp; Time:</strong> {formattedDate} | {formattedStart}–{formattedEnd}
        </p>
        <p className={styles.duration}>
          <strong>Duration:</strong> {durationHrs} hrs
        </p>
        <p><strong>Available Tickets:</strong> {event.availableTickets}</p>
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

        {/* FAQs */}
        {event.faqs?.length ? (
          <>
            <button className={styles.faqButton} onClick={() => setShowFaqs(true)}>
              View FAQs
            </button>
            {showFaqs && <FaqModal faqs={event.faqs} onClose={() => setShowFaqs(false)} />}
          </>
        ) : null}

        {/* Expired */}
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
              <label>Adults</label>
              <input
                type="number"
                min={0}
                value={freeAdultCount}
                onChange={(e) => setFreeAdultCount(clampNonNegative(parseInt(e.target.value) || 0))}
              />
            </div>
            {!event.adultOnly && (
              <div className={styles.formGroup}>
                <label>Kids</label>
                <input
                  type="number"
                  min={0}
                  value={freeKidCount}
                  onChange={(e) => setFreeKidCount(clampNonNegative(parseInt(e.target.value) || 0))}
                />
              </div>
            )}
            <button
              onClick={handleFreeRSVP}
              className={styles.bookingButton}
              disabled={loadingRsvp}
            >
              {loadingRsvp ? "Submitting…" : "RSVP"}
            </button>
          </div>
        ) : (
          <div className={styles.bookingForm}>
            <h3>Book Your Tickets</h3>
            <div className={styles.formGroup}>
              <label>Adult Tickets</label>
              <input
                type="number"
                min={0}
                value={adultCount}
                onChange={(e) => setAdultCount(clampNonNegative(parseInt(e.target.value) || 0))}
              />
            </div>
            {!event.adultOnly && (
              <div className={styles.formGroup}>
                <label>Child Tickets</label>
                <input
                  type="number"
                  min={0}
                  value={kidCount}
                  onChange={(e) => setKidCount(clampNonNegative(parseInt(e.target.value) || 0))}
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
            <button
              onClick={handleBook}
              className={styles.bookingButton}
              disabled={loadingBooking}
            >
              {loadingBooking ? "Submitting…" : "Book"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
