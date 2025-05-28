// File: app/events/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import EventCard from "@/components/Events/EventCard";
import styles from "@/components/Events/Events.module.css";

export interface EventData {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  location: string;
  date: string;         // ISO date string
  startTime: string;    // "HH:MM" format
  endTime: string;      // "HH:MM" format
  adultPrice: number;
  kidPrice: number;
  kidPriceInfo?: string | null;
  availableTickets: number;
  isFree: boolean;
  adultOnly: boolean;
  faqs?: { id: string; question: string; answer: string }[];
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (!res.ok) throw new Error("Failed to fetch events");
        const { events: fetched } = await res.json();
        const eventsFromDB: EventData[] = fetched.map((ev: any) => ({
          id:               ev.id,
          title:            ev.title,
          description:      ev.description,
          image:            ev.image,
          location:         ev.location,
          date:             ev.date,
          startTime:        ev.startTime,
          endTime:          ev.endTime,
          adultPrice:       ev.adultPrice,
          kidPrice:         ev.kidPrice,
          kidPriceInfo:     ev.kidPriceInfo,
          availableTickets: ev.availableTickets,
          isFree:           ev.isFree,
          adultOnly:        ev.adultOnly,
          faqs:             ev.faqs,
        }));
        setEvents(eventsFromDB);
      } catch (error) {
        console.error(error);
        toast.error("Error fetching events");
      }
    }
    fetchEvents();
  }, []);

  if (events.length === 0) {
    return (
      <section
        className={styles.eventsPage}
        style={{ textAlign: "center", padding: "2rem" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="100"
          viewBox="0 0 24 24"
          width="100"
          fill="#ccc"
          style={{ marginBottom: "1rem" }}
        >
          <path d="M0 0h24v24H0z" fill="none" />
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V7h8v2z" />
        </svg>
        <h2>No events available at the moment.</h2>
        <p>Please check back later for upcoming events.</p>
      </section>
    );
  }

  return (
    <section className={styles.eventsPage}>
      <h1 className={styles.eventsHeader}>Upcoming Events</h1>
      <div className={styles.eventsGrid}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
