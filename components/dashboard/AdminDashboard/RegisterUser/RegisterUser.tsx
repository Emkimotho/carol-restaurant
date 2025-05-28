// File: components/dashboard/AdminDashboard/RegisterUser/RegisterUser.tsx
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import styles from "./RegisterUser.module.css";

type RoleOption = "STAFF" | "DRIVER" | "SERVER" | "CASHIER";
const ALL_ROLES: RoleOption[] = ["STAFF", "DRIVER", "SERVER", "CASHIER"];

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
    setRoles(rs =>
      rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error("First, last name and email are required.");
      return setLoading(false);
    }
    if (!roles.length) {
      toast.error("Select at least one role.");
      return setLoading(false);
    }
    if (
      roles.includes("DRIVER") &&
      (!form.licenseNumber || !form.carMakeModel)
    ) {
      toast.error("Driver must have license and vehicle info.");
      return setLoading(false);
    }

    try {
      const data = new FormData();
      data.append("firstName", form.firstName);
      data.append("lastName", form.lastName);
      data.append("email", form.email);
      data.append("phone", form.phone);
      data.append("position", form.position);
      roles.forEach(r => data.append("roles", r));
      if (roles.includes("DRIVER")) {
        data.append("licenseNumber", form.licenseNumber);
        data.append("carMakeModel", form.carMakeModel);
      }
      if (photoFile) data.append("photo", photoFile);

      const res = await fetch("/api/registeruser", {
        method: "POST",
        body: data,
      });
      if (!res.ok) throw new Error((await res.json()).message);

      toast.success("User created & emailed.");
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
        className={styles.submitButton}
        disabled={loading}
      >
        {loading ? "Creating…" : "Create User"}
      </button>
    </form>
  );
}
