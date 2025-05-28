// File: components/dashboard/CustomerDashboard/CustomerDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaUserCircle,
  FaClipboardList,
  FaHistory,
  FaEdit,
} from "react-icons/fa";
import { toast } from "react-toastify";
import styles from "./CustomerDashboard.module.css";

interface Order {
  id: string;
  date: string;
  total: number;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  streetAddress: string | null;
  aptSuite: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

type SectionKey = "profile" | "pending" | "past" | "edit";

export default function CustomerDashboard() {
  const [section, setSection] = useState<SectionKey>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    phone: "",
    streetAddress: "",
    aptSuite: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/customer/dashboard");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setProfile(data.profile);
        setPendingOrders(data.pendingOrders);
        setPastOrders(data.pastOrders);
        setForm({
          phone: data.profile.phone ?? "",
          streetAddress: data.profile.streetAddress ?? "",
          aptSuite: data.profile.aptSuite ?? "",
          city: data.profile.city ?? "",
          state: data.profile.state ?? "",
          zip: data.profile.zip ?? "",
          country: data.profile.country ?? "",
        });
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const { profile: updated } = await res.json();
      setProfile(updated);
      toast.success("Profile updated!");
      setSection("profile");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const renderSection = () => {
    if (loading) return <p>Loading…</p>;

    switch (section) {
      case "profile":
        if (!profile) return <p>No profile data.</p>;

        // Build formatted address lines
        const street = profile.streetAddress?.trim();
        const rawApt = profile.aptSuite?.trim();
        const aptLabel =
          rawApt &&
          !/^apt[\s\.]/i.test(rawApt) // if it doesn't already start with "apt"
            ? `Apt. ${rawApt}`
            : rawApt;
        const line1 = [street, aptLabel].filter(Boolean).join(" ");
        const line2 =
          [profile.city, profile.state].filter(Boolean).join(", ") +
          (profile.zip ? ` ${profile.zip}` : "");
        const country = profile.country?.trim() ?? "USA";
        const addressLines = [line1, line2, country].filter(Boolean);

        return (
          <div className={styles.sectionCard}>
            <h2>Your Profile</h2>
            <ul className={styles.profileList}>
              <li>
                <strong>Name:</strong> {profile.firstName} {profile.lastName}
              </li>
              <li>
                <strong>Email:</strong> {profile.email}
              </li>
              <li>
                <strong>Phone:</strong> {profile.phone || "—"}
              </li>
              <li>
                <strong>Address:</strong>
                <div className={styles.addressBlock}>
                  {addressLines.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              </li>
            </ul>
          </div>
        );

      case "pending":
        return (
          <div className={styles.sectionCard}>
            <h2>Pending Orders</h2>
            {pendingOrders.length ? (
              <ul className={styles.orderList}>
                {pendingOrders.map((o) => (
                  <li key={o.id}>
                    <div className={styles.orderInfo}>
                      <span>#{o.id}</span>
                      <span>{o.date}</span>
                      <span>${o.total.toFixed(2)}</span>
                    </div>
                    <Link href={`/track-delivery/${o.id}`}>
                      <button className={styles.trackBtn}>Track</button>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No pending orders.</p>
            )}
          </div>
        );

      case "past":
        return (
          <div className={styles.sectionCard}>
            <h2>Past Orders</h2>
            {pastOrders.length ? (
              <ul className={styles.orderList}>
                {pastOrders.map((o) => (
                  <li key={o.id}>
                    <span>#{o.id}</span>
                    <span>{o.date}</span>
                    <span>${o.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No past orders.</p>
            )}
          </div>
        );

      case "edit":
        return (
          <div className={styles.sectionCard}>
            <h2>Edit Contact Info</h2>
            <form className={styles.editForm} onSubmit={handleSave}>
              {[
                "phone",
                "streetAddress",
                "aptSuite",
                "city",
                "state",
                "zip",
                "country",
              ].map((field) => (
                <div key={field} className={styles.formRow}>
                  <label htmlFor={field}>
                    {field
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (s) => s.toUpperCase())}
                  </label>
                  <input
                    id={field}
                    name={field}
                    value={(form as any)[field]}
                    onChange={handleFormChange}
                  />
                </div>
              ))}
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </form>
          </div>
        );
    }
  };

  const tabs: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile", icon: <FaUserCircle /> },
    { key: "pending", label: "Pending Orders", icon: <FaClipboardList /> },
    { key: "past", label: "Past Orders", icon: <FaHistory /> },
    { key: "edit", label: "Edit Info", icon: <FaEdit /> },
  ];

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        {profile && (
          <div className={styles.profileSummary}>
            <FaUserCircle className={styles.avatar} />
            <div className={styles.name}>
              {profile.firstName} {profile.lastName}
            </div>
          </div>
        )}
        <nav className={styles.nav}>
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`${styles.navBtn} ${
                section === key ? styles.active : ""
              }`}
            >
              <span className={styles.icon}>{icon}</span>
              <span className={styles.label}>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className={styles.main}>{renderSection()}</main>
    </div>
  );
}
