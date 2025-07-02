// File: components/dashboard/AdminDashboard/RegisterUser/RegisterUser.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import styles from "./RegisterUser.module.css";

type RoleOption = "STAFF" | "DRIVER" | "SERVER" | "CASHIER";
const ALL_ROLES: RoleOption[] = ["STAFF", "DRIVER", "SERVER", "CASHIER"];

// These env vars must be set in your NEXT_PUBLIC_ namespace
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export default function RegisterUserForm() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    position: "",
    licenseNumber: "",
    carMakeModel: "",
  });
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  // Preview uploaded photo
  useEffect(() => {
    if (!photoFile) return setPreviewUrl("");
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === "photo" && files) {
      setPhotoFile(files[0]);
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const toggleRole = (r: RoleOption) =>
    setRoles(rs => (rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error("First, last name and email are required.");
      setLoading(false);
      return;
    }
    if (!roles.length) {
      toast.error("Select at least one role.");
      setLoading(false);
      return;
    }
    if (
      roles.includes("DRIVER") &&
      (!form.licenseNumber || !form.carMakeModel)
    ) {
      toast.error("Driver must have license and vehicle info.");
      setLoading(false);
      return;
    }

    try {
      let photoUrl: string | undefined;
      // 1) If a file is selected, upload it to Cloudinary
      if (photoFile) {
        const cloudData = new FormData();
        cloudData.append("file", photoFile);
        cloudData.append("upload_preset", UPLOAD_PRESET);

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
          { method: "POST", body: cloudData }
        );
        if (!cloudRes.ok) {
          throw new Error("Photo upload failed");
        }
        const cloudJson = await cloudRes.json();
        photoUrl = cloudJson.secure_url;
      }

      // 2) Build payload to your own API
      const payload: any = {
        firstName: form.firstName,
        lastName:  form.lastName,
        email:     form.email,
        phone:     form.phone,
        position:  form.position,
        roles,
      };
      if (roles.includes("DRIVER")) {
        payload.licenseNumber = form.licenseNumber;
        payload.carMakeModel  = form.carMakeModel;
      }
      if (photoUrl) {
        payload.photoUrl = photoUrl;
      }

      // 3) Send to your backend
      const res = await fetch("/api/registeruser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }

      toast.success("User created & emailed.");
      // reset
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        position: "",
        licenseNumber: "",
        carMakeModel: "",
      });
      setRoles([]);
      setPhotoFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        name="firstName"
        placeholder="First name"
        value={form.firstName}
        onChange={handleChange}
        required
      />
      <input
        name="lastName"
        placeholder="Last name"
        value={form.lastName}
        onChange={handleChange}
        required
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        required
      />
      <input
        name="phone"
        placeholder="Phone"
        value={form.phone}
        onChange={handleChange}
      />

      <input
        name="position"
        placeholder="Position (e.g. Waitress)"
        value={form.position}
        onChange={handleChange}
      />

      <fieldset className={styles.rolesFieldset}>
        <legend>Assign Roles</legend>
        {ALL_ROLES.map(r => (
          <label key={r} className={styles.roleLabel}>
            <input
              type="checkbox"
              checked={roles.includes(r)}
              onChange={() => toggleRole(r)}
            />{" "}
            {r}
          </label>
        ))}
      </fieldset>

      {roles.includes("DRIVER") && (
        <>
          <input
            name="licenseNumber"
            placeholder="License number"
            value={form.licenseNumber}
            onChange={handleChange}
            required
          />
          <input
            name="carMakeModel"
            placeholder="Car make & model"
            value={form.carMakeModel}
            onChange={handleChange}
            required
          />
        </>
      )}

      <label className={styles.fileLabel}>
        {photoFile ? "Change Photo" : "Upload Photo"}
        <input
          type="file"
          name="photo"
          accept="image/*"
          onChange={handleChange}
        />
      </label>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Preview"
          className={styles.previewImage}
        />
      )}

      <button
        type="submit"
        className={styles.submitButton}
        disabled={loading}
      >
        {loading ? "Creating…" : "Create User"}
      </button>
    </form>
  );
}
