// File: components/dashboard/AdminDashboard/RegisterUser/RegisterUser.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import styles from "./RegisterUser.module.css";

type RoleOption = "STAFF" | "DRIVER" | "SERVER" | "CASHIER";
const ALL_ROLES: RoleOption[] = ["STAFF", "DRIVER", "SERVER", "CASHIER"];

// These must be defined in your NEXT_PUBLIC_ env
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

  // Generate a preview when the user selects a file
  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === "photo" && files?.[0]) {
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

    // 1) Client-side validation
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error("First name, last name and email are required.");
      setLoading(false);
      return;
    }
    if (!roles.length) {
      toast.error("Select at least one role.");
      setLoading(false);
      return;
    }
    if (roles.includes("DRIVER") && (!form.licenseNumber || !form.carMakeModel)) {
      toast.error("Driver must have license & vehicle info.");
      setLoading(false);
      return;
    }

    try {
      // 2) Upload photo to Cloudinary (if provided)
      let uploadedPhotoUrl: string | undefined;
      if (photoFile) {
        const cloudData = new FormData();
        cloudData.append("file", photoFile);
        cloudData.append("upload_preset", UPLOAD_PRESET);

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
          { method: "POST", body: cloudData }
        );
        if (!cloudRes.ok) {
          const errText = await cloudRes.text();
          throw new Error("Photo upload failed: " + errText);
        }
        const cloudJson = await cloudRes.json();
        uploadedPhotoUrl = cloudJson.secure_url as string;
      }

      // 3) Build JSON payload for your backend
      const payload: Record<string, any> = {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        phone:     form.phone.trim(),
        position:  form.position.trim(),
        roles,
      };
      if (roles.includes("DRIVER")) {
        payload.licenseNumber = form.licenseNumber.trim();
        payload.carMakeModel  = form.carMakeModel.trim();
      }
      if (uploadedPhotoUrl) {
        payload.photoUrl = uploadedPhotoUrl;
      }

      // 4) Send to your own API
      const apiRes = await fetch("/api/registeruser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!apiRes.ok) {
        const err = await apiRes.json();
        throw new Error(err.message || "Registration failed");
      }

      toast.success("User created & email sent!");
      // reset form
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
    } catch (error: any) {
      console.error("Registration Error:", error);
      toast.error(error.message || "Registration failed");
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
        <img src={previewUrl} alt="Preview" className={styles.previewImage} />
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
