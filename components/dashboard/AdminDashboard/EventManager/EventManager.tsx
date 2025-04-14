"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import styles from "./EventManager.module.css";

interface EventData {
  id: string;
  title: string;
  description: string;
  image?: string;
  location: string;
  date: string;
  time: string;
  adultPrice: number;
  kidPrice: number;
  availableTickets: number;
  isFree: boolean;
  adultOnly: boolean;
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
  time: string;
  adultPrice: string;
  kidPrice: string;
  availableTickets: string;
  isFree: boolean;
  adultOnly: boolean;
}

interface Booking {
  id: string;
  eventId: string;
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
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
  createdAt: string;
}

const defaultFormData: EventFormData = {
  title: "",
  description: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  date: "",
  time: "",
  adultPrice: "",
  kidPrice: "",
  availableTickets: "",
  isFree: false,
  adultOnly: false,
};

// Helper to resolve image paths.
const resolveImagePath = (image?: string) => {
  if (!image) return "";
  if (image.startsWith("/images/")) return image;
  if (image.startsWith("uploads/"))
    return `/images/${image.replace("uploads/", "")}`;
  return `/images/${image}`;
};

const EventManager: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [formData, setFormData] = useState<EventFormData>(defaultFormData);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "submissions">("events");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data.events);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events.");
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/bookings");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      const data = await res.json();
      setBookings(data.bookings);
    } catch (error: any) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to fetch bookings.");
    }
  };

  const fetchRSVPs = async () => {
    try {
      const res = await fetch("/api/rsvps");
      if (!res.ok) throw new Error("Failed to fetch RSVPs");
      const data = await res.json();
      setRsvps(data.rsvps);
    } catch (error: any) {
      console.error("Error fetching RSVPs:", error);
      toast.error("Failed to fetch RSVPs.");
    }
  };

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
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateOrUpdateEvent = async () => {
    if (editingId) {
      const payload = {
        ...formData,
        location: `${formData.street}, ${formData.city}, ${formData.state} ${formData.zip}`,
      };
      try {
        const res = await fetch(`/api/events/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          const errorData = await res.json();
          toast.error("Error: " + errorData.message);
          return;
        }
        toast.success("Event updated successfully!");
        resetForm();
        fetchEvents();
      } catch (error: any) {
        console.error("Error updating event:", error);
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
      payload.append("time", formData.time);
      const adultPriceNum = formData.adultPrice ? parseFloat(formData.adultPrice) : 0;
      const kidPriceNum = formData.kidPrice ? parseFloat(formData.kidPrice) : 0;
      payload.append("adultPrice", adultPriceNum.toString());
      payload.append("kidPrice", kidPriceNum.toString());
      payload.append("availableTickets", formData.availableTickets);
      payload.append("isFree", formData.isFree.toString());
      payload.append("adultOnly", formData.adultOnly.toString());
      if (selectedImage) {
        payload.append("image", selectedImage);
      }
      try {
        const res = await fetch("/api/events", {
          method: "POST",
          body: payload,
        });
        if (!res.ok) {
          const errorData = await res.json();
          toast.error("Error: " + errorData.message);
          return;
        }
        toast.success("Event created successfully!");
        resetForm();
        fetchEvents();
      } catch (error: any) {
        console.error("Error creating event:", error);
        toast.error("Error creating event.");
      }
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json();
        toast.error("Error: " + errorData.message);
        return;
      }
      toast.success("Event deleted successfully!");
      fetchEvents();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Error deleting event.");
    }
  };

  const handleEditEvent = (ev: EventData) => {
    const [street, city, rest] = ev.location.split(",");
    let state = "", zip = "";
    if (rest) {
      const parts = rest.trim().split(" ");
      state = parts[0] || "";
      zip = parts[1] || "";
    }
    setFormData({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      street: street ? street.trim() : "",
      city: city ? city.trim() : "",
      state,
      zip,
      date: ev.date.split("T")[0],
      time: ev.time,
      adultPrice: ev.adultPrice ? ev.adultPrice.toString() : "",
      kidPrice: ev.kidPrice ? ev.kidPrice.toString() : "",
      availableTickets: ev.availableTickets.toString(),
      isFree: ev.isFree,
      adultOnly: ev.adultOnly,
    });
    setEditingId(ev.id);
    if (ev.image) {
      setImagePreview(resolveImagePath(ev.image));
    } else {
      setImagePreview(null);
    }
    // Scroll to top so that the form is visible
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fetch submissions when "Submissions" tab is active.
  const fetchSubmissions = async () => {
    try {
      const bookingsRes = await fetch("/api/bookings");
      const rsvpsRes = await fetch("/api/rsvps");
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings);
      }
      if (rsvpsRes.ok) {
        const rsvpsData = await rsvpsRes.json();
        setRsvps(rsvpsData.rsvps);
      }
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      toast.error("Error fetching submissions.");
    }
  };

  useEffect(() => {
    if (activeTab === "submissions") {
      fetchSubmissions();
    }
  }, [activeTab]);

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Event Manager</h2>
      <div className={styles.tabButtons}>
        <button
          className={`${styles.tabButton} ${activeTab === "events" ? styles.active : ""}`}
          onClick={() => setActiveTab("events")}
        >
          Events
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "submissions" ? styles.active : ""}`}
          onClick={() => setActiveTab("submissions")}
        >
          Submissions
        </button>
      </div>
      {activeTab === "events" ? (
        <>
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

              <label htmlFor="time" className={styles.inputLabel}>
                Time
              </label>
              <input
                id="time"
                className={styles.input}
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
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
                  setFormData({ ...formData, availableTickets: e.target.value })
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
                  <img
                    src={imagePreview}
                    alt="Image Preview"
                    className={styles.imagePreview}
                  />
                )}
              </div>

              <button className={styles.button} onClick={handleCreateOrUpdateEvent}>
                {editingId ? "Update Event" : "Create Event"}
              </button>
              {editingId && (
                <button className={`${styles.button} mt-2`} onClick={resetForm}>
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
                      <strong>{ev.title}</strong> -{" "}
                      {new Date(ev.date).toLocaleDateString()} at {ev.time}
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
      ) : (
        <section className={styles.submissionsSection}>
          <h3 className={styles.subheading}>Submissions</h3>
          <div className={styles.submissionButtons}>
            <button
              className={styles.tabButton}
              onClick={() => {
                fetch("/api/bookings")
                  .then((res) => res.json())
                  .then((data) => setBookings(data.bookings))
                  .catch((error) => {
                    console.error("Error fetching bookings:", error);
                    toast.error("Error fetching bookings.");
                  });
              }}
            >
              View Bookings
            </button>
            <button
              className={styles.tabButton}
              onClick={() => {
                fetch("/api/rsvps")
                  .then((res) => res.json())
                  .then((data) => setRsvps(data.rsvps))
                  .catch((error) => {
                    console.error("Error fetching RSVPs:", error);
                    toast.error("Error fetching RSVPs.");
                  });
              }}
            >
              View RSVPs
            </button>
          </div>
          <div className={styles.submissionLists}>
            <h4>Bookings</h4>
            {bookings.length === 0 ? (
              <p>No bookings submitted.</p>
            ) : (
              <ul className={styles.eventList}>
                {bookings.map((b) => (
                  <li key={b.id}>
                    {b.name} - {b.adultCount} Adult(s), {b.kidCount} Kid(s) - $
                    {b.totalPrice}
                  </li>
                ))}
              </ul>
            )}
            <h4>RSVPs</h4>
            {rsvps.length === 0 ? (
              <p>No RSVPs submitted.</p>
            ) : (
              <ul className={styles.eventList}>
                {rsvps.map((r) => (
                  <li key={r.id}>
                    {r.name} - {r.adultCount} Adult(s), {r.kidCount} Kid(s)
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default EventManager;
