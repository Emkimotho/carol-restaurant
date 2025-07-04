/* ──────────────────────────────────────────────────────────────────────────────
   File: components/dashboard/AdminDashboard/RegisterUser/RegisterUser.tsx
   Description: Admin-side form that creates new users (staff / driver / etc.).
   Notes:
     • Supports Cloudinary image upload (env: NEXT_PUBLIC_CLOUDINARY_*).
     • Sends data to /api/registeruser where the server handles DB + email.
     • Roles now include "ADMIN" so any admin can promote another.
   ────────────────────────────────────────────────────────────────────────────*/
"use client";

import React, { useEffect, useState } from "react";
import { toast }                      from "react-toastify";
import styles                         from "./RegisterUser.module.css";

/* -------------------------------------------------------------------------- */
/*  Role setup                                                                */
/* -------------------------------------------------------------------------- */
export type RoleOption =
  | "ADMIN"
  | "STAFF"
  | "DRIVER"
  | "SERVER"
  | "CASHIER";

const ALL_ROLES: RoleOption[] = [
  "ADMIN",
  "STAFF",
  "DRIVER",
  "SERVER",
  "CASHIER",
];

/* -------------------------------------------------------------------------- */
/*  Environment vars (compile-time crash if missing)                          */
/* -------------------------------------------------------------------------- */
const CLOUD_NAME   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

/* -------------------------------------------------------------------------- */
/*  Form state types                                                          */
/* -------------------------------------------------------------------------- */
interface FormState {
  firstName:     string;
  lastName:      string;
  email:         string;
  phone:         string;
  position:      string;
  licenseNumber: string;
  carMakeModel:  string;
}

const BLANK_FORM: FormState = {
  firstName:     "",
  lastName:      "",
  email:         "",
  phone:         "",
  position:      "",
  licenseNumber: "",
  carMakeModel:  "",
};

/* ════════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════*/
export default function RegisterUserForm() {
  const [form,      setForm]      = useState<FormState>(BLANK_FORM);
  const [roles,     setRoles]     = useState<RoleOption[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [preview,   setPreview]   = useState("");
  const [loading,   setLoading]   = useState(false);

  /* ---------- local image preview ---------- */
  useEffect(() => {
    if (!photoFile) { setPreview(""); return; }
    const url = URL.createObjectURL(photoFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  /* ---------- input / checkbox handlers ---------- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;

    if (name === "photo" && files?.[0]) {
      setPhotoFile(files[0]);
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toggleRole = (role: RoleOption) =>
    setRoles(r =>
      r.includes(role) ? r.filter(x => x !== role) : [...r, role]
    );

  /* ---------- submit ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    /* client-side checks */
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error("First name, last name and email are required."); setLoading(false); return;
    }
    if (roles.length === 0) {
      toast.error("Select at least one role."); setLoading(false); return;
    }
    const wantsDriver = roles.includes("DRIVER");
    if (wantsDriver && (!form.licenseNumber || !form.carMakeModel)) {
      toast.error("Driver must have license & vehicle info."); setLoading(false); return;
    }

    try {
      /* 1️⃣ Optional Cloudinary upload */
      let photoUrl: string | undefined;
      if (photoFile) {
        const fd = new FormData();
        fd.append("file", photoFile);
        fd.append("upload_preset", UPLOAD_PRESET);

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
          { method: "POST", body: fd }
        );
        if (!cloudRes.ok) {
          throw new Error("Photo upload failed.");
        }
        const { secure_url } = await cloudRes.json();
        photoUrl = secure_url;
      }

      /* 2️⃣ Build payload */
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName : form.lastName.trim(),
        email    : form.email.trim(),
        phone    : form.phone.trim(),
        position : form.position.trim(),
        roles,
      };
      if (wantsDriver) {
        payload.licenseNumber = form.licenseNumber.trim();
        payload.carMakeModel  = form.carMakeModel.trim();
      }
      if (photoUrl) payload.photoUrl = photoUrl;

      /* 3️⃣ POST to API */
      const apiRes = await fetch("/api/registeruser", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(payload),
      });
      if (!apiRes.ok) {
        const { message } = await apiRes.json().catch(() => ({}));
        throw new Error(message ?? "Registration failed.");
      }

      toast.success("User created – invitation email sent!");

      /* reset form */
      setForm(BLANK_FORM);
      setRoles([]);
      setPhotoFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message ?? "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ══════════════════════ JSX ══════════════════════ */
  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {/* Basic info --------------------------------------------------------- */}
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

      {/* Role checkboxes ---------------------------------------------------- */}
      <fieldset className={styles.rolesFieldset}>
        <legend>Assign Roles</legend>
        {ALL_ROLES.map(role => (
          <label key={role} className={styles.roleLabel}>
            <input
              type="checkbox"
              checked={roles.includes(role)}
              onChange={() => toggleRole(role)}
            />{" "}
            {role}
          </label>
        ))}
      </fieldset>

      {/* Driver extras ------------------------------------------------------ */}
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

      {/* Photo -------------------------------------------------------------- */}
      <label className={styles.fileLabel}>
        {photoFile ? "Change Photo" : "Upload Photo"}
        <input
          type="file"
          name="photo"
          accept="image/*"
          onChange={handleChange}
        />
      </label>
      {preview && (
        <img src={preview} alt="Preview" className={styles.previewImage} />
      )}

      {/* Submit ------------------------------------------------------------- */}
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
