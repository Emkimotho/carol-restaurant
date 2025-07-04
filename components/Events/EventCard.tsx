// File: components/Events/EventCard.tsx
"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from "react";
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

/* -------- best-image helper -------- */
const resolveImageSrc = (evt: EventData): string => {
  if ((evt as any).imageUrl) return (evt as any).imageUrl;
  const id = (evt as any).cloudinaryPublicId as string | undefined;
  if (id) return getCloudinaryImageUrl(id, 400, 300);
  if ((evt as any).image?.startsWith("/images/")) return (evt as any).image;
  if ((evt as any).image) return `/images/${(evt as any).image.replace(/^uploads\//, "")}`;
  return "";
};

export default function EventCard({ event }: { event: EventData }) {
  const router = useRouter();

  /* -------- date/time parsing -------- */
  const [datePart] = event.date.split("T");
  const startRaw   = event.startTime ?? (event as any).time;
  const endRaw     = event.endTime   ?? (event as any).time;
  const startDate  = new Date(`${datePart}T${startRaw}`);
  const endDate    = new Date(`${datePart}T${endRaw}`);
  const now        = new Date();
  const isPast     = endDate < now;

  /* formatted strings */
  const formattedDate  = new Date(event.date).toLocaleDateString();
  const formattedStart = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  const formattedEnd   = endDate  .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  const durationHrs    = Math.round(((endDate.getTime() - startDate.getTime()) / 3_600_000) * 10) / 10;

  /* -------- state (paid) -------- */
  const [adultCount, setAdultCount] = useState(0);
  const [kidCount,   setKidCount]   = useState(0);
  const [payerName,  setPayerName]  = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [loadingBooking, setLoadingBooking] = useState(false);

  /* -------- state (RSVP) -------- */
  const [rsvpName,  setRsvpName]  = useState("");
  const [rsvpEmail, setRsvpEmail] = useState("");
  const [freeAdult, setFreeAdult] = useState(0);
  const [freeKid,   setFreeKid]   = useState(0);
  const [reserved,  setReserved]  = useState<{ adultCount: number; kidCount: number } | null>(null);
  const [loadingRsvp, setLoadingRsvp] = useState(false);

  /* -------- misc -------- */
  const [showFaqs, setShowFaqs] = useState(false);
  const totalPrice       = adultCount * event.adultPrice + kidCount * event.kidPrice;
  const totalFreeTickets = freeAdult + freeKid;
  const clamp = (v: number) => (v >= 0 ? v : 0);

  /* -------- scrolling helper -------- */
  const thankRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reserved) {
      // smooth scroll to very top (avoids header overlap)
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [reserved]);

  /* -------- input helpers -------- */
  const stripZeros = (val: string) => val.replace(/^0+(?=\d)/, "");
  const handleNumInput =
    (setFn: React.Dispatch<React.SetStateAction<number>>) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const cleaned = stripZeros(e.target.value);
      e.target.value = cleaned; // immediate visual update
      setFn(clamp(parseInt(cleaned, 10) || 0));
    };

  const handleNumBlur =
    (setFn: React.Dispatch<React.SetStateAction<number>>) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      const num = parseInt(e.target.value, 10) || 0;
      setFn(clamp(num));
      e.target.value = num.toString();
    };

  /* -------- RSVP (free) -------- */
  const submitRSVP = async () => {
    if (loadingRsvp) return;
    const name = rsvpName.trim();
    const mail = rsvpEmail.trim();

    if (!name || !mail || totalFreeTickets <= 0) {
      toast.error("Please fill name, email, and select at least one ticket."); return;
    }
    if (isPast) { toast.error("This event has passed; RSVP not allowed."); return; }
    if (!event.isFree) { toast.error("This event requires payment; RSVP not allowed."); return; }
    if (typeof event.availableTickets === "number" && event.availableTickets < totalFreeTickets) {
      toast.error("Not enough tickets available."); return;
    }

    setLoadingRsvp(true);
    try {
      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: mail, adultCount: freeAdult, kidCount: freeKid }),
      });
      const data = (await res.json()) as RsvpResponse;
      if (!res.ok) toast.error("RSVP failed: " + (data.message ?? "Unknown error"));
      else {
        setReserved(data.reserved ?? { adultCount: freeAdult, kidCount: freeKid });
        toast.success("RSVP confirmed! Thank you.");
        // clear fields
        setRsvpName(""); setRsvpEmail(""); setFreeAdult(0); setFreeKid(0);
      }
    } catch (err) {
      console.error(err); toast.error("Error submitting RSVP.");
    } finally {
      setLoadingRsvp(false);
    }
  };

  /* -------- Booking (paid) -------- */
  const submitBooking = async () => {
    if (loadingBooking) return;
    const name = payerName.trim(), mail = payerEmail.trim();

    if (!name || !mail || adultCount + kidCount <= 0) {
      toast.error("Please select tickets and fill out name and email."); return;
    }
    if (isPast) { toast.error("This event has passed; booking not allowed."); return; }
    if (typeof event.availableTickets === "number" && event.availableTickets < adultCount + kidCount) {
      toast.error("Not enough tickets available."); return;
    }

    setLoadingBooking(true);
    try {
      const res = await fetch(`/api/events/${event.id}/booking-init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: mail, adultCount, kidCount }),
      });
      const data = (await res.json()) as BookingInitResponse;
      if (!res.ok) toast.error("Booking failed: " + (data.message ?? "Unknown error"));
      else if (data.bookingId) {
        toast.success("Booking created! Redirecting…");
        router.push(`/events/summary/${data.bookingId}`);
      } else toast.error("Booking initialization did not return an ID.");
    } catch (err) {
      console.error(err); toast.error("Error initializing booking.");
    } finally {
      setLoadingBooking(false);
    }
  };

  /* -------- Thank-you (free) -------- */
  if (event.isFree && reserved) {
    return (
      <div ref={thankRef} className={styles.thankYouPanel}>
        <h3>Thank you for RSVPing!</h3>
        <p>
          We reserved {reserved.adultCount} adult ticket
          {reserved.adultCount !== 1 ? "s" : ""}
          {reserved.kidCount > 0 &&
            ` and ${reserved.kidCount} kid ticket${reserved.kidCount !== 1 ? "s" : ""}`}.
        </p>
        <p>No ticket codes needed for free events.</p>
      </div>
    );
  }

  /* ---------------- JSX ---------------- */
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
        <p><strong>Date &amp; Time:</strong> {formattedDate} | {formattedStart}–{formattedEnd}</p>
        <p className={styles.duration}><strong>Duration:</strong> {durationHrs} hrs</p>
        <p><strong>Available Tickets:</strong> {event.availableTickets}</p>

        {event.kidPriceInfo && (
          <p className={styles.kidInfo}><strong>Child Pricing:</strong> {event.kidPriceInfo}</p>
        )}

        <p>
          <strong>Price:</strong>{" "}
          {event.isFree ? "Free" : `Adults: $${event.adultPrice}${event.adultOnly ? " (Adults Only)" : ""}`}
        </p>
        {event.adultOnly && !event.isFree && <p className={styles.adultsOnly}>Adults Only</p>}

        {/* FAQs */}
        {event.faqs?.length ? (
          <>
            <button className={styles.faqButton} onClick={() => setShowFaqs(true)}>View FAQs</button>
            {showFaqs && <FaqModal faqs={event.faqs} onClose={() => setShowFaqs(false)} />}
          </>
        ) : null}

        {/* Forms */}
        {isPast ? (
          <div className={styles.expiredMessage}><p>This event has expired.</p></div>
        ) : event.isFree ? (
          /* RSVP form */
          <div className={styles.bookingForm}>
            <h3>RSVP for Free Event</h3>
            <div className={styles.formGroup}>
              <label>Name</label>
              <input type="text" value={rsvpName} placeholder="Your Name" onChange={(e) => setRsvpName(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input type="email" value={rsvpEmail} placeholder="Your Email" onChange={(e) => setRsvpEmail(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Adults</label>
              <input
                type="number" min={0}
                onFocus={(e) => (e.target.value = stripZeros(e.target.value))}
                value={freeAdult}
                onChange={handleNumInput(setFreeAdult)}
                onBlur={handleNumBlur(setFreeAdult)}
              />
            </div>
            {!event.adultOnly && (
              <div className={styles.formGroup}>
                <label>Kids</label>
                <input
                  type="number" min={0}
                  onFocus={(e) => (e.target.value = stripZeros(e.target.value))}
                  value={freeKid}
                  onChange={handleNumInput(setFreeKid)}
                  onBlur={handleNumBlur(setFreeKid)}
                />
              </div>
            )}
            <button className={styles.bookingButton} onClick={submitRSVP} disabled={loadingRsvp}>
              {loadingRsvp ? "Submitting…" : "RSVP"}
            </button>
          </div>
        ) : (
          /* Paid booking form */
          <div className={styles.bookingForm}>
            <h3>Book Your Tickets</h3>
            <div className={styles.formGroup}>
              <label>Adult Tickets</label>
              <input
                type="number" min={0}
                onFocus={(e) => (e.target.value = stripZeros(e.target.value))}
                value={adultCount}
                onChange={handleNumInput(setAdultCount)}
                onBlur={handleNumBlur(setAdultCount)}
              />
            </div>
            {!event.adultOnly && (
              <div className={styles.formGroup}>
                <label>Child Tickets</label>
                <input
                  type="number" min={0}
                  onFocus={(e) => (e.target.value = stripZeros(e.target.value))}
                  value={kidCount}
                  onChange={handleNumInput(setKidCount)}
                  onBlur={handleNumBlur(setKidCount)}
                />
              </div>
            )}
            <div className={styles.formGroup}>
              <label>Your Name</label>
              <input type="text" value={payerName} placeholder="Your Name" onChange={(e) => setPayerName(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Your Email</label>
              <input type="email" value={payerEmail} placeholder="Your Email" onChange={(e) => setPayerEmail(e.target.value)} />
            </div>
            <div className={styles.totalPrice}>Total: ${totalPrice.toFixed(2)}</div>
            <button className={styles.bookingButton} onClick={submitBooking} disabled={loadingBooking}>
              {loadingBooking ? "Submitting…" : "Book"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
