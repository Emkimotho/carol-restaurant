// File: components/dashboard/CustomerDashboard/CustomerDashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  FaUserCircle,
  FaClipboardList,
  FaHistory,
  FaEdit,
} from "react-icons/fa";
import { toast } from "react-toastify";
import styles from "./CustomerDashboard.module.css";

interface OrderItem {
  title: string;
  quantity: number;
}

interface Order {
  id: string;          // internal UUID
  orderId: string;     // friendly ORD-… slug
  date: string;        // YYYY-MM-DD
  total: number;
  items: OrderItem[];
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

// simple fetcher for SWR
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Network error");
    return res.json();
  });

export default function CustomerDashboard() {
  const [section, setSection] = useState<SectionKey>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
  const [loadingProfile, setLoadingProfile] = useState(true);

  // 1) Load profile & initialize form
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/customer/dashboard");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setProfile(data.profile);
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
        toast.error("Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  // 2) Fetch orders on-demand based on section
  const statusMap: Record<SectionKey, string> = {
    profile: "",
    edit: "",
    pending: "active",
    past: "past",
  };
  const shouldFetch = section === "pending" || section === "past";
  const { data: ordersData, error: ordersError } = useSWR<{
    orders: Order[];
  }>(
    shouldFetch
      ? `/api/customer/orders?which=${statusMap[section]}`
      : null,
    fetcher
  );
  const loadingOrders = shouldFetch && !ordersData && !ordersError;
  const ordersList = ordersData?.orders ?? [];

  // 3) Form handlers
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

  // 4) Render sections
  const renderSection = () => {
    if (loadingProfile) return <p>Loading profile…</p>;

    switch (section) {
      case "profile":
        if (!profile) return <p>No profile data.</p>;
        // build address lines
        const street = profile.streetAddress?.trim();
        const rawApt = profile.aptSuite?.trim();
        const aptLabel =
          rawApt && !/^apt[\s\.]/i.test(rawApt) ? `Apt. ${rawApt}` : rawApt;
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
      case "past":
        if (ordersError) return <p>Error loading orders.</p>;
        if (loadingOrders) return <p>Loading orders…</p>;
        return (
          <div className={styles.sectionCard}>
            <h2>{section === "pending" ? "Pending Orders" : "Past Orders"}</h2>
            {ordersList.length ? (
              <ul className={styles.orderList}>
                {ordersList.map((o) => (
                  <li key={o.id}>
                    <div className={styles.orderInfo}>
                      <span>#{o.orderId}</span>
                      <span>{o.date}</span>
                      <span>${o.total.toFixed(2)}</span>
                    </div>
                    <ul className={styles.itemList}>
                      {o.items.map((it, i) => (
                        <li key={i}>
                          {it.title} × {it.quantity}
                        </li>
                      ))}
                    </ul>
                    {section === "pending" && (
                      <Link href={`/track-delivery/${o.orderId}`}>
                        <button className={styles.trackBtn}>Track</button>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No {section === "pending" ? "pending" : "past"} orders.</p>
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

  // 5) Tabs
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
