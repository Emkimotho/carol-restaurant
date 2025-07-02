"use client";

/*  =====================================================================
    EventManager – Admin dashboard panel
      • Create / edit / delete Events
      • View & delete Bookings and RSVPs, filterable by sub-tab
      • Maintains original logic 100 %, plus:
            – SubmissionCard UI
            – bookings / rsvps sub-tabs & delete endpoints
            – per-event aggregated booking totals
  ===================================================================== */

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import SubmissionCard from "./SubmissionCard";
import SubmissionTotals from "./SubmissionTotals";
import styles from "./EventManager.module.css";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface EventData {
  id: string;
  title: string;
  description: string;
  image?: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  adultPrice: number;
  kidPrice: number;
  kidPriceInfo?: string;
  availableTickets: number;
  isFree: boolean;
  adultOnly: boolean;
  faqs?: { question: string; answer: string }[];
}

interface EventFormData {
  id?: string;
  title: string;
  description: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  date: string;
  startTime: string;
  endTime: string;
  adultPrice: string;
  kidPrice: string;
  kidPriceInfo: string;
  availableTickets: string;
  isFree: boolean;
  adultOnly: boolean;
  faqs: { question: string; answer: string }[];
}

interface Booking {
  id: string;
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
  totalPrice: number;
  createdAt: string;
}

interface RSVP {
  id: string;
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
  createdAt: string;
}

type SubmissionView = "bookings" | "rsvps";

/* ------------------------------------------------------------------ */
/*  Defaults & helpers                                                */
/* ------------------------------------------------------------------ */
const defaultFormData: EventFormData = {
  title: "",
  description: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  date: "",
  startTime: "",
  endTime: "",
  adultPrice: "",
  kidPrice: "",
  kidPriceInfo: "",
  availableTickets: "",
  isFree: false,
  adultOnly: false,
  faqs: [],
};

const resolveImagePath = (image?: string) => {
  if (!image) return "";
  if (image.startsWith("/images/")) return image;
  if (image.startsWith("uploads/"))
    return `/images/${image.replace("uploads/", "")}`;
  return `/images/${image}`;
};

/* ====================================================================== */
const EventManager: React.FC = () => {
  /* ------------------------------------------------------------------ */
  /*  State                                                             */
  /* ------------------------------------------------------------------ */
  const [events, setEvents] = useState<EventData[]>([]);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] =
    useState<"events" | "submissions">("events");
  const [submissionView, setSubmissionView] =
    useState<SubmissionView>("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);

  /* ------------------------------------------------------------------ */
  /*  Fetch Events                                                      */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data.events);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      toast.error("Failed to fetch events.");
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Fetch Bookings & RSVPs                                            */
  /* ------------------------------------------------------------------ */
  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/events/bookings");
      if (!res.ok) {
        const text = await res.text();
        console.warn("GET /api/events/bookings:", res.status, text);
        setBookings([]);
        return;
      }
      const data = await res.json();
      setBookings(data.bookings);
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
      toast.error("Failed to fetch bookings.");
      setBookings([]);
    }
  };

  const fetchRSVPs = async () => {
    try {
      const res = await fetch("/api/events/rsvps");
      if (!res.ok) throw new Error("Failed to fetch RSVPs");
      const data = await res.json();
      setRsvps(data.rsvps);
    } catch (err: any) {
      console.error("Error fetching RSVPs:", err);
      toast.error("Failed to fetch RSVPs.");
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Delete Booking / RSVP                                             */
  /* ------------------------------------------------------------------ */
  const deleteBooking = async (id: string) => {
    if (!confirm("Delete this booking?")) return;
    try {
      const res = await fetch(`/api/events/bookings/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error("Error: " + err.message);
        return;
      }
      toast.success("Booking deleted");
      fetchBookings();
    } catch (err: any) {
      console.error("Error deleting booking:", err);
      toast.error("Error deleting booking.");
    }
  };

  const deleteRsvp = async (id: string) => {
    if (!confirm("Delete this RSVP?")) return;
    try {
      const res = await fetch(`/api/events/rsvps/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error("Error: " + err.message);
        return;
      }
      toast.success("RSVP deleted");
      fetchRSVPs();
    } catch (err: any) {
      console.error("Error deleting RSVP:", err);
      toast.error("Error deleting RSVP.");
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Form helpers                                                      */
  /* ------------------------------------------------------------------ */
  const resetForm = () => {
    setFormData(defaultFormData);
    setSelectedImage(null);
    setImagePreview(null);
    setEditingId(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Create / Update Event                                             */
  /* ------------------------------------------------------------------ */
  const handleCreateOrUpdateEvent = async () => {
    if (editingId) {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        isFree: formData.isFree,
        adultOnly: formData.adultOnly,
        kidPriceInfo: formData.kidPriceInfo,
        faqs: formData.faqs,
        availableTickets: parseInt(formData.availableTickets) || 0,
      };
      if (!formData.isFree) {
        payload.adultPrice = parseFloat(formData.adultPrice) || 0;
        if (!formData.adultOnly)
          payload.kidPrice = parseFloat(formData.kidPrice) || 0;
      }

      try {
        const res = await fetch(`/api/events/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error("Error: " + err.message);
          return;
        }
        toast.success("Event updated!");
        resetForm();
        fetchEvents();
      } catch (err: any) {
        console.error("Error updating event:", err);
        toast.error("Error updating event.");
      }
    } else {
      const payload = new FormData();
      payload.append("title", formData.title);
      payload.append("description", formData.description);
      payload.append("street", formData.street);
      payload.append("city", formData.city);
      payload.append("state", formData.state);
      payload.append("zip", formData.zip);
      payload.append("date", formData.date);
      payload.append("startTime", formData.startTime);
      payload.append("endTime", formData.endTime);
      if (!formData.isFree) {
        payload.append("adultPrice", formData.adultPrice || "0");
        if (!formData.adultOnly) {
          payload.append("kidPrice", formData.kidPrice || "0");
        }
      }
      payload.append("kidPriceInfo", formData.kidPriceInfo);
      payload.append("availableTickets", formData.availableTickets);
      payload.append("isFree", String(formData.isFree));
      payload.append("adultOnly", String(formData.adultOnly));
      payload.append("faqs", JSON.stringify(formData.faqs));
      if (selectedImage) payload.append("image", selectedImage);

      try {
        const res = await fetch("/api/events", { method: "POST", body: payload });
        if (!res.ok) {
          const err = await res.json();
          toast.error("Error: " + err.message);
          return;
        }
        toast.success("Event created!");
        resetForm();
        fetchEvents();
      } catch (err: any) {
        console.error("Error creating event:", err);
        toast.error("Error creating event.");
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Delete & Edit Event                                               */
  /* ------------------------------------------------------------------ */
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error("Error: " + err.message);
        return;
      }
      toast.success("Event deleted!");
      fetchEvents();
    } catch (err: any) {
      console.error("Error deleting event:", err);
      toast.error("Error deleting event.");
    }
  };

  const handleEditEvent = (ev: EventData) => {
    const [street, city, rest] = ev.location.split(",");
    const [state, zip] = rest.trim().split(" ");
    setFormData({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      street: street.trim(),
      city: city.trim(),
      state,
      zip,
      date: ev.date.split("T")[0],
      startTime: ev.startTime,
      endTime: ev.endTime,
      adultPrice: ev.adultPrice.toString(),
      kidPrice: ev.kidPrice.toString(),
      kidPriceInfo: ev.kidPriceInfo || "",
      availableTickets: ev.availableTickets.toString(),
      isFree: ev.isFree,
      adultOnly: ev.adultOnly,
      faqs: ev.faqs || [],
    });
    setEditingId(ev.id);
    setImagePreview(ev.image ? resolveImagePath(ev.image) : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ------------------------------------------------------------------ */
  /*  Group bookings per event                                          */
  /* ------------------------------------------------------------------ */
  const bookingSummaries = useMemo(() => {
    const map: Record<
      string,
      { eventId: string; eventTitle: string; adultCount: number; kidCount: number }
    > = {};
    for (const b of bookings) {
      if (!map[b.eventId]) {
        map[b.eventId] = {
          eventId: b.eventId,
          eventTitle: b.eventTitle,
          adultCount: 0,
          kidCount: 0,
        };
      }
      map[b.eventId].adultCount += b.adultCount;
      map[b.eventId].kidCount += b.kidCount;
    }
    return Object.values(map);
  }, [bookings]);

  /* ------------------------------------------------------------------ */
  /*  Auto-load submissions                                             */
  /* ------------------------------------------------------------------ */
  const loadIfNeeded = (view: SubmissionView) => {
    if (view === "bookings" && bookings.length === 0) fetchBookings();
    if (view === "rsvps" && rsvps.length === 0) fetchRSVPs();
  };

  useEffect(() => {
    if (activeTab === "submissions") loadIfNeeded(submissionView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, submissionView]);

  /* ------------------------------------------------------------------ */
  /*  Render helpers                                                    */
  /* ------------------------------------------------------------------ */
  const renderBookingCards = () =>
    bookings.map((b) => (
      <SubmissionCard
        key={b.id}
        id={b.id}
        eventTitle={b.eventTitle}
        name={b.name}
        email={b.email}
        createdAt={b.createdAt}
        adultCount={b.adultCount}
        kidCount={b.kidCount}
        totalPrice={b.totalPrice}
        onDelete={deleteBooking}
      />
    ));

  const renderRsvpCards = () =>
    rsvps.map((r) => (
      <SubmissionCard
        key={r.id}
        id={r.id}
        eventTitle={r.eventTitle}
        name={r.name}
        email={r.email}
        createdAt={r.createdAt}
        adultCount={r.adultCount}
        kidCount={r.kidCount}
        onDelete={deleteRsvp}
      />
    ));

  /* ===================================================================
     JSX
  =================================================================== */
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Event Manager</h2>

      {/* ---------------- MAIN TABS ---------------- */}
      <div className={styles.tabButtons}>
        <button
          className={`${styles.tabButton} ${
            activeTab === "events" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("events")}
        >
          Events
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "submissions" ? styles.active : ""
          }`}
          onClick={() => setActiveTab("submissions")}
        >
          Submissions
        </button>
      </div>

      {/* ===================================================== */}
      {/*  EVENTS TAB                                           */}
      {/* ===================================================== */}
      {activeTab === "events" && (
        <>
          {/* --------------- CREATE / EDIT FORM --------------- */}
          <section className={styles.section}>
            <h3 className={styles.subheading}>
              {editingId ? "Edit Event" : "Create New Event"}
            </h3>

            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.inputLabel}>
                Title
              </label>
              <input
                id="title"
                className={styles.input}
                type="text"
                placeholder="Enter event title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />

              <label htmlFor="description" className={styles.inputLabel}>
                Description
              </label>
              <textarea
                id="description"
                className={styles.textarea}
                placeholder="Enter event description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />

              <fieldset className={styles.fieldset}>
                <legend className={styles.fieldsetLegend}>Address</legend>

                <label htmlFor="street" className={styles.inputLabel}>
                  Street
                </label>
                <input
                  id="street"
                  className={styles.input}
                  type="text"
                  placeholder="123 Main St"
                  value={formData.street}
                  onChange={(e) =>
                    setFormData({ ...formData, street: e.target.value })
                  }
                />

                <label htmlFor="city" className={styles.inputLabel}>
                  City
                </label>
                <input
                  id="city"
                  className={styles.input}
                  type="text"
                  placeholder="City"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />

                <label htmlFor="state" className={styles.inputLabel}>
                  State
                </label>
                <input
                  id="state"
                  className={styles.input}
                  type="text"
                  placeholder="State"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />

                <label htmlFor="zip" className={styles.inputLabel}>
                  ZIP
                </label>
                <input
                  id="zip"
                  className={styles.input}
                  type="text"
                  placeholder="ZIP Code"
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData({ ...formData, zip: e.target.value })
                  }
                />
              </fieldset>

              <label htmlFor="date" className={styles.inputLabel}>
                Date
              </label>
              <input
                id="date"
                className={styles.input}
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />

              <label htmlFor="startTime" className={styles.inputLabel}>
                Start Time
              </label>
              <input
                id="startTime"
                className={styles.input}
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
              />

              <label htmlFor="endTime" className={styles.inputLabel}>
                End Time
              </label>
              <input
                id="endTime"
                className={styles.input}
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
              />

              <div className="flex items-center gap-2 mt-2">
                <input
                  id="isFree"
                  type="checkbox"
                  checked={formData.isFree}
                  onChange={(e) =>
                    setFormData({ ...formData, isFree: e.target.checked })
                  }
                />
                <label htmlFor="isFree" className={styles.inputLabel}>
                  Free Event
                </label>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  id="adultOnly"
                  type="checkbox"
                  checked={formData.adultOnly}
                  onChange={(e) =>
                    setFormData({ ...formData, adultOnly: e.target.checked })
                  }
                />
                <label htmlFor="adultOnly" className={styles.inputLabel}>
                  Adults Only
                </label>
              </div>

              {!formData.isFree ? (
                <>
                  <label htmlFor="adultPrice" className={styles.inputLabel}>
                    Cost per Adult
                  </label>
                  <input
                    id="adultPrice"
                    className={styles.input}
                    type="text"
                    placeholder="0.00$"
                    value={formData.adultPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, adultPrice: e.target.value })
                    }
                  />

                  {!formData.adultOnly && (
                    <>
                      <label htmlFor="kidPrice" className={styles.inputLabel}>
                        Cost per Child
                      </label>
                      <input
                        id="kidPrice"
                        className={styles.input}
                        type="text"
                        placeholder="0.00$"
                        value={formData.kidPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, kidPrice: e.target.value })
                        }
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="mt-4">
                  <Image
                    src="/images/free.svg"
                    alt="Free Event"
                    width={80}
                    height={80}
                    className={styles.freeIcon}
                  />
                </div>
              )}

              <label htmlFor="kidPriceInfo" className={styles.inputLabel}>
                Child Pricing Descriptor
              </label>
              <input
                id="kidPriceInfo"
                className={styles.input}
                type="text"
                placeholder="Kids 5–14 yrs @ $15; under 5 free"
                value={formData.kidPriceInfo}
                onChange={(e) =>
                  setFormData({ ...formData, kidPriceInfo: e.target.value })
                }
              />

              <fieldset className={styles.fieldset}>
                <legend className={styles.fieldsetLegend}>FAQs</legend>
                {formData.faqs.map((faq, idx) => (
                  <div key={idx} className={styles.faqItem}>
                    <label className={styles.inputLabel}>Question</label>
                    <input
                      className={styles.input}
                      type="text"
                      value={faq.question}
                      onChange={(e) => {
                        const newFaqs = [...formData.faqs];
                        newFaqs[idx].question = e.target.value;
                        setFormData({ ...formData, faqs: newFaqs });
                      }}
                    />
                    <label className={styles.inputLabel}>Answer</label>
                    <textarea
                      className={styles.textarea}
                      value={faq.answer}
                      onChange={(e) => {
                        const newFaqs = [...formData.faqs];
                        newFaqs[idx].answer = e.target.value;
                        setFormData({ ...formData, faqs: newFaqs });
                      }}
                    />
                    <button
                      type="button"
                      className={styles.removeFaqButton}
                      onClick={() => {
                        const newFaqs = formData.faqs.filter(
                          (_, i) => i !== idx
                        );
                        setFormData({ ...formData, faqs: newFaqs });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={styles.addFaqButton}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      faqs: [...formData.faqs, { question: "", answer: "" }],
                    })
                  }
                >
                  Add FAQ
                </button>
              </fieldset>

              <label htmlFor="availableTickets" className={styles.inputLabel}>
                Tickets Available
              </label>
              <input
                id="availableTickets"
                className={styles.input}
                type="text"
                placeholder="Enter number of tickets"
                value={formData.availableTickets}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    availableTickets: e.target.value,
                  })
                }
              />

              <div className={styles.formGroup}>
  <label htmlFor="imageUpload" className={styles.inputLabel}>
    Upload Event Image
  </label>
  <input
    id="imageUpload"
    type="file"
    accept="image/*"
    className={styles.fileInput}
    onChange={handleImageChange}
  />
  {imagePreview && (
    <div className={styles.imagePreviewWrapper}>
      <Image
        src={imagePreview}
        alt="Image Preview"
        width={300}
        height={200}
        style={{ objectFit: "cover", borderRadius: "0.5rem" }}
        unoptimized
        className={styles.imagePreview}
      />
    </div>
  )}
</div>

              <button
                className={styles.button}
                onClick={handleCreateOrUpdateEvent}
              >
                {editingId ? "Update Event" : "Create Event"}
              </button>
              {editingId && (
                <button
                  className={`${styles.button} mt-2`}
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </section>

          <section>
            <h3 className={styles.subheading}>Current Events</h3>
            {events.length === 0 ? (
              <p className={styles.noEvents}>No events available.</p>
            ) : (
              <ul className={styles.eventList}>
                {events.map((ev) => (
                  <li key={ev.id} className={styles.eventItem}>
                    <div className={styles.eventDetails}>
                      <strong>{ev.title}</strong> —{" "}
                      {new Date(ev.date).toLocaleDateString()} at{" "}
                      {ev.startTime}–{ev.endTime}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEditEvent(ev)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleDeleteEvent(ev.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

          {/* ===================================================== */}
      {/*  SUBMISSIONS TAB                                      */}
      {/* ===================================================== */}
      {activeTab === "submissions" && (
        <section className={styles.submissionsSection}>
          <h3 className={styles.subheading}>Submissions</h3>

          <div className={styles.submissionButtons}>
            <button
              className={`${styles.tabButton} ${
                submissionView === "bookings" ? styles.active : ""
              }`}
              onClick={() => {
                setSubmissionView("bookings");
                loadIfNeeded("bookings");
              }}
            >
              Bookings
            </button>
            <button
              className={`${styles.tabButton} ${
                submissionView === "rsvps" ? styles.active : ""
              }`}
              onClick={() => {
                setSubmissionView("rsvps");
                loadIfNeeded("rsvps");
              }}
            >
              RSVPs
            </button>
          </div>

          {/* Totals Buttons */}
          <SubmissionTotals
            data={bookings}
            visible={submissionView === "bookings"}
            buttonLabel="Booking Totals"
            modalTitle="Totals by Booking"
          />
          <SubmissionTotals
            data={rsvps}
            visible={submissionView === "rsvps"}
            buttonLabel="RSVP Totals"
            modalTitle="Totals by RSVP"
          />

          <div className={styles.submissionLists}>
            {submissionView === "bookings" ? (
              bookings.length === 0 ? (
                <p>No bookings submitted.</p>
              ) : (
                renderBookingCards()
              )
            ) : rsvps.length === 0 ? (
              <p>No RSVPs submitted.</p>
            ) : (
              renderRsvpCards()
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default EventManager;
