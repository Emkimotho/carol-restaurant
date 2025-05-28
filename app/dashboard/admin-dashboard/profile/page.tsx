// File: app/dashboard/admin-dashboard/profile/page.tsx
// -----------------------------------------------------
//  Admin Dashboard → Profile
//  • Loads profile for the currently-signed-in admin by ID
//  • Lets the admin update contact / address / position
//  • Displays success / error toasts on save via react-toastify
// -----------------------------------------------------

"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import styles from "@/components/dashboard/AdminDashboard/Profile.module.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  streetAddress?: string | null;
  aptSuite?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  staffProfile?: { position?: string | null };
}

export default function AdminProfilePage() {
  const { data: session } = useSession();
  const roles = (session?.user as any)?.roles as string[] | undefined;

  // Client-side guard: only ADMIN may view/edit
  if (session && roles && !roles.includes("ADMIN")) {
    return <p className={styles.error}>Access denied</p>;
  }

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [phone, setPhone]           = useState("");
  const [streetAddress, setStreet]  = useState("");
  const [aptSuite, setAptSuite]     = useState("");
  const [city, setCity]             = useState("");
  const [stateField, setStateField] = useState("");
  const [zip, setZip]               = useState("");
  const [country, setCountry]       = useState("");
  const [position, setPosition]     = useState("");

  useEffect(() => {
    if (!session?.user?.id) return;
    let isMounted = true;
    setLoading(true);

    async function fetchProfile() {
      try {
        const res = await fetch("/api/admin/profile");
        if (!res.ok) {
          const { message } = await res.json().catch(() => ({
            message: res.statusText,
          }));
          throw new Error(message || "Failed to load profile");
        }
        const { profile: p }: { profile: ProfileData } = await res.json();
        if (!isMounted) return;
        setProfile(p);
        setPhone(p.phone ?? "");
        setStreet(p.streetAddress ?? "");
        setAptSuite(p.aptSuite ?? "");
        setCity(p.city ?? "");
        setStateField(p.state ?? "");
        setZip(p.zip ?? "");
        setCountry(p.country ?? "");
        setPosition(p.staffProfile?.position ?? "");
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error(err);
        toast.error(err.message || "Could not load profile");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          streetAddress,
          aptSuite,
          city,
          state: stateField,
          zip,
          country,
          position,
        }),
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({
          message: res.statusText,
        }));
        throw new Error(message || "Update failed");
      }
      const { profile: updated }: { profile: ProfileData } = await res.json();
      setProfile(updated);
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) {
    return <p>Loading…</p>;
  }

  return (
    <div className={styles.container}>
      {/* ToastContainer must be mounted once */}
      <ToastContainer position="top-right" autoClose={3000} />

      <h2>Admin Profile</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Read-only core fields */}
        <div className={styles.fieldGroup}>
          <label>First Name</label>
          <input type="text" value={profile?.firstName ?? ""} disabled />
        </div>
        <div className={styles.fieldGroup}>
          <label>Last Name</label>
          <input type="text" value={profile?.lastName ?? ""} disabled />
        </div>
        <div className={styles.fieldGroup}>
          <label>Email</label>
          <input type="email" value={profile?.email ?? ""} disabled />
        </div>

        {/* Editable contact / address / position */}
        <div className={styles.fieldGroup}>
          <label>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>Street Address</label>
          <input
            type="text"
            value={streetAddress}
            onChange={(e) => setStreet(e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>Apt / Suite</label>
          <input
            type="text"
            value={aptSuite}
            onChange={(e) => setAptSuite(e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>State</label>
          <input
            type="text"
            value={stateField}
            onChange={(e) => setStateField(e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>Zip</label>
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label>Position</label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
