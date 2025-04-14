"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { convertTo12Hour } from "@/utils/timeUtils"; // Adjust if needed
import styles from "./FeedbackCenterManager.module.css";

// Helper to truncate text
function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

// Types
interface ContactSubmission {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
}

interface CateringSubmission {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  date: string; // ISO
  time: string; // "HH:MM" in 24-hour
  venue: string;
  guests: number;
  message?: string;
  createdAt: string;
}

interface ReservationSubmission {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  date: string; // ISO
  time: string; // "HH:MM"
  guests: number;
  message?: string;
  createdAt: string;
}

type Tab = "contact" | "catering" | "reservation";

export default function FeedbackCenterManager() {
  const [activeTab, setActiveTab] = useState<Tab>("contact");

  // Submission states
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [caterings, setCaterings] = useState<CateringSubmission[]>([]);
  const [reservations, setReservations] = useState<ReservationSubmission[]>([]);

  // Popup modal control
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  // Fetch data on mount
  useEffect(() => {
    fetchContacts();
    fetchCaterings();
    fetchReservations();
  }, []);

  // =====================
  //   FETCH FUNCTIONS
  // =====================
  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/feedbackcenter/contact");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setContacts(json.data);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to fetch contact submissions.");
    }
  };

  const fetchCaterings = async () => {
    try {
      const res = await fetch("/api/feedbackcenter/catering");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCaterings(json.data);
    } catch (error: any) {
      console.error("Error fetching caterings:", error);
      toast.error("Failed to fetch catering submissions.");
    }
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/feedbackcenter/reservation");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setReservations(json.data);
    } catch (error: any) {
      console.error("Error fetching reservations:", error);
      toast.error("Failed to fetch reservation submissions.");
    }
  };

  // =====================
  //   DELETE FUNCTIONS
  // =====================
  const deleteContact = async (id: string) => {
    if (!confirm("Delete this contact submission?")) return;
    try {
      const res = await fetch(`/api/feedbackcenter/contact/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Contact submission deleted.");
      fetchContacts();
    } catch (error: any) {
      toast.error("Failed to delete contact submission.");
    }
  };

  const deleteCatering = async (id: string) => {
    if (!confirm("Delete this catering request?")) return;
    try {
      const res = await fetch(`/api/feedbackcenter/catering/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Catering request deleted.");
      fetchCaterings();
    } catch (error: any) {
      toast.error("Failed to delete catering request.");
    }
  };

  const deleteReservation = async (id: string) => {
    if (!confirm("Delete this reservation?")) return;
    try {
      const res = await fetch(`/api/feedbackcenter/reservation/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Reservation deleted.");
      fetchReservations();
    } catch (error: any) {
      toast.error("Failed to delete reservation.");
    }
  };

  // =====================
  //   MODAL HANDLING
  // =====================
  function handleViewMessage(message: string) {
    setPopupMessage(message);
    setIsPopupOpen(true);
  }

  function closePopup() {
    setPopupMessage("");
    setIsPopupOpen(false);
  }

  // =====================
  //   RENDER
  // =====================
  return (
    <div className={styles.pageContainer}>
      <h2 className={styles.heading}>Feedback Center</h2>

      {/* TAB BUTTONS */}
      <div className={styles.tabButtons}>
        <button
          className={`${styles.tabButton} ${activeTab === "contact" ? styles.active : ""}`}
          onClick={() => setActiveTab("contact")}
        >
          Contact
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "catering" ? styles.active : ""}`}
          onClick={() => setActiveTab("catering")}
        >
          Catering
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "reservation" ? styles.active : ""}`}
          onClick={() => setActiveTab("reservation")}
        >
          Reservation
        </button>
      </div>

      <div className={styles.tabContent}>
        {/* CONTACT TAB */}
        {activeTab === "contact" && (
          <>
            <h3 className={styles.tableTitle}>Contact Submissions</h3>
            {contacts.length === 0 ? (
              <p>No contact submissions found.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.sheetTable}>
                  <thead>
                    <tr>
                      <th className={styles.stickyCol1}>#</th>
                      <th className={styles.stickyCol2}>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Message (Preview)</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((c, i) => {
                      const preview = truncate(c.message, 30);
                      return (
                        <tr key={c.id}>
                          <td className={styles.stickyCol1}>{i + 1}</td>
                          <td className={styles.stickyCol2}>{c.fullName}</td>
                          <td>{c.email}</td>
                          <td>{c.phone}</td>
                          <td>
                            {preview}{" "}
                            <button className={styles.viewButton} onClick={() => handleViewMessage(c.message)}>
                              View
                            </button>
                          </td>
                          <td>{new Date(c.createdAt).toLocaleString()}</td>
                          <td>
                            <button className={styles.deleteButton} onClick={() => deleteContact(c.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* CATERING TAB */}
        {activeTab === "catering" && (
          <>
            <h3 className={styles.tableTitle}>Catering Requests</h3>
            {caterings.length === 0 ? (
              <p>No catering requests found.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.sheetTable}>
                  <thead>
                    <tr>
                      <th className={styles.stickyCol1}>#</th>
                      <th className={styles.stickyCol2}>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Venue</th>
                      <th>Guests</th>
                      <th>Message (Preview)</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caterings.map((cat, i) => {
                      const dateDisplay = new Date(cat.date).toLocaleDateString();
                      const timeDisplay = convertTo12Hour(cat.time);
                      const preview = truncate(cat.message || "", 30);
                      return (
                        <tr key={cat.id}>
                          <td className={styles.stickyCol1}>{i + 1}</td>
                          <td className={styles.stickyCol2}>{cat.fullName}</td>
                          <td>{cat.email}</td>
                          <td>{cat.phone}</td>
                          <td>{dateDisplay}</td>
                          <td>{timeDisplay}</td>
                          <td>{cat.venue}</td>
                          <td>{cat.guests}</td>
                          <td>
                            {preview}{" "}
                            <button className={styles.viewButton} onClick={() => handleViewMessage(cat.message || "")}>
                              View
                            </button>
                          </td>
                          <td>{new Date(cat.createdAt).toLocaleString()}</td>
                          <td>
                            <button className={styles.deleteButton} onClick={() => deleteCatering(cat.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* RESERVATION TAB */}
        {activeTab === "reservation" && (
          <>
            <h3 className={styles.tableTitle}>Reservation Requests</h3>
            {reservations.length === 0 ? (
              <p>No reservations found.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.sheetTable}>
                  <thead>
                    <tr>
                      <th className={styles.stickyCol1}>#</th>
                      <th className={styles.stickyCol2}>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Guests</th>
                      <th>Message (Preview)</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((res, i) => {
                      const dateDisplay = new Date(res.date).toLocaleDateString();
                      const timeDisplay = convertTo12Hour(res.time);
                      const preview = truncate(res.message || "", 30);
                      return (
                        <tr key={res.id}>
                          <td className={styles.stickyCol1}>{i + 1}</td>
                          <td className={styles.stickyCol2}>{res.fullName}</td>
                          <td>{res.email}</td>
                          <td>{res.phone}</td>
                          <td>{dateDisplay}</td>
                          <td>{timeDisplay}</td>
                          <td>{res.guests}</td>
                          <td>
                            {preview}{" "}
                            <button className={styles.viewButton} onClick={() => handleViewMessage(res.message || "")}>
                              View
                            </button>
                          </td>
                          <td>{new Date(res.createdAt).toLocaleString()}</td>
                          <td>
                            <button className={styles.deleteButton} onClick={() => deleteReservation(res.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL POPUP */}
      {isPopupOpen && (
        <div className={styles.modalBackdrop} onClick={closePopup}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closePopup}>
              &times;
            </button>
            <h3>Full Message</h3>
            <p className={styles.modalMessage}>{popupMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
