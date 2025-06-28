// File: app/events/summary/[bookingId]/page.tsx

import { prisma } from "@/lib/prisma";
import ConfirmSessionButton from "@/components/Events/ConfirmSessionButton";
import { notFound } from "next/navigation";
import styles from "../Summary.module.css"; // adjust path if needed

interface BookingSummaryPageProps {
  // params may be a promise in Next.js App Router
  params: Promise<{ bookingId: string }>;
}

export default async function BookingSummaryPage({ params }: BookingSummaryPageProps) {
  // Await params before using
  const { bookingId } = await params;

  // 1. Fetch booking + event details
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          location: true,
          adultPrice: true,
          kidPrice: true,
          adultOnly: true,
          isFree: true,
        },
      },
    },
  });
  if (!booking) {
    notFound();
  }

  // 2. If event is free, show RSVP confirmation
  if (booking.event.isFree) {
    return (
      <div className={styles.container}>
        <div className={styles.rsvpMessage}>
          <h1 className={styles.rsvpTitle}>RSVP Confirmed</h1>
          <p className={styles.rsvpText}>
            Thank you for RSVPing for <strong>{booking.event.title}</strong> on{" "}
            {new Date(booking.event.date).toLocaleDateString()} at{" "}
            {booking.event.startTime} in {booking.event.location}.
          </p>
          <p className={styles.rsvpText}>
            We have recorded your RSVP. If you have questions, contact support. Enjoy the event!
          </p>
        </div>
      </div>
    );
  }

  // 3. Compute display fields for paid booking
  const eventDateStr = new Date(booking.event.date).toLocaleDateString();
  const eventTimeStr = booking.event.startTime;
  const totalPrice = booking.totalPrice;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Booking Summary</h1>

        {/* Event details */}
        <section className={styles.section}>
          <h2 className={styles.subtitle}>{booking.event.title}</h2>
          <div className={styles.row}>
            <span className={styles.label}>Date &amp; Time:</span>
            <span className={styles.value}>
              {eventDateStr} @ {eventTimeStr}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Location:</span>
            <span className={styles.value}>{booking.event.location}</span>
          </div>
        </section>

        {/* Booker info */}
        <section className={styles.section}>
          <div className={styles.row}>
            <span className={styles.label}>Name:</span>
            <span className={styles.value}>{booking.name}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Email:</span>
            <span className={styles.value}>{booking.email}</span>
          </div>
        </section>

        {/* Ticket counts & price */}
        <section className={styles.section}>
          <div className={styles.row}>
            <span className={styles.label}>Tickets:</span>
            <span className={styles.value}>
              {booking.adultCount} Adult{booking.adultCount !== 1 ? "s" : ""}
              {!booking.event.adultOnly && (
                <>
                  , {booking.kidCount} Kid{booking.kidCount !== 1 ? "s" : ""}
                </>
              )}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Total Price:</span>
            <span className={styles.value}>${totalPrice.toFixed(2)}</span>
          </div>
        </section>

        {/* Confirm & Pay button */}
        <div className={styles.buttonWrapper}>
          <ConfirmSessionButton bookingId={bookingId} />
        </div>
      </div>
    </div>
  );
}
