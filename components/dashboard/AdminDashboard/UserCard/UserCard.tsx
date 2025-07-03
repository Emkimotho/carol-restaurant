// File: components/dashboard/AdminDashboard/UserCard/UserCard.tsx
"use client";

import React from "react";
import Image from "next/image";
import styles from "./UserCard.module.css";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";

export interface UserCardProps {
  id: number;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  roles: string[];  // e.g. ["STAFF","DRIVER","SERVER","CASHIER"]
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  /** Cloudinary public ID, if available */
  photoPublicId?: string;
  /** Legacy or direct URL (e.g. "/uploads/...") */
  photoUrl?: string;
  licenseNumber?: string;
  carMakeModel?: string;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (action: "suspend" | "unsuspend" | "ban") => void;
  onToggleRole: (role: "STAFF" | "DRIVER" | "SERVER" | "CASHIER") => void;
}

// Only these four roles are togglable in the UI
const ASSIGNABLE_ROLES: Array<"STAFF" | "DRIVER" | "SERVER" | "CASHIER"> = [
  "STAFF",
  "DRIVER",
  "SERVER",
  "CASHIER",
];

const UserCard: React.FC<UserCardProps> = ({
  name,
  position,
  email,
  phone,
  roles,
  status,
  photoPublicId,
  photoUrl,
  licenseNumber,
  carMakeModel,
  onStatusChange,
  onEdit,
  onDelete,
  onToggleRole,
}) => {
  // Decide which avatar source to use
  let avatarSrc: string | undefined;
  let unoptimized = false;

  if (photoPublicId) {
    // Cloudinary URL at 120×120
    avatarSrc = getCloudinaryImageUrl(photoPublicId, 120, 120);
    unoptimized = true; // skip Next.js optimization for external CDN
  } else if (photoUrl) {
    avatarSrc = photoUrl;
  }

  return (
    <div className={styles.card}>
      {/* Avatar */}
      {avatarSrc ? (
        <div className={styles.avatarWrapper}>
          <Image
            src={avatarSrc}
            alt={name}
            width={120}
            height={120}
            className={styles.avatar}
            unoptimized={unoptimized}
          />
        </div>
      ) : (
        <div className={styles.avatarPlaceholder}>{name[0]}</div>
      )}

      {/* User Info */}
      <div className={styles.info}>
        <h4 className={styles.name}>{name}</h4>

        {position && (
          <p className={styles.detail}>
            <strong>Position:</strong> {position}
          </p>
        )}

        <p className={styles.detail}>
          <strong>Email:</strong> {email}
        </p>
        {phone && (
          <p className={styles.detail}>
            <strong>Phone:</strong> {phone}
          </p>
        )}

        {licenseNumber && (
          <p className={styles.detail}>
            <strong>License #:</strong> {licenseNumber}
          </p>
        )}
        {carMakeModel && (
          <p className={styles.detail}>
            <strong>Vehicle:</strong> {carMakeModel}
          </p>
        )}

        <p className={`${styles.status} ${styles[`status${status}`]}`}>
          {status.replace("_", " ")}
        </p>

        {/* Role toggles */}
        <div className={styles.roleToggles}>
          {ASSIGNABLE_ROLES.map((r) => (
            <label key={r} className={styles.roleLabel}>
              <input
                type="checkbox"
                checked={roles.includes(r)}
                onChange={() => onToggleRole(r)}
              />{" "}
              {r}
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.buttonBar}>
        <div className={styles.row}>
          {status === "ACTIVE" && (
            <>
              <button
                className={styles.suspend}
                onClick={() => onStatusChange("suspend")}
              >
                Suspend
              </button>
              <button
                className={styles.ban}
                onClick={() => onStatusChange("ban")}
              >
                Ban
              </button>
            </>
          )}
          {status === "SUSPENDED" && (
            <>
              <button
                className={styles.enable}
                onClick={() => onStatusChange("unsuspend")}
              >
                Enable
              </button>
              <button
                className={styles.ban}
                onClick={() => onStatusChange("ban")}
              >
                Ban
              </button>
            </>
          )}
          {status === "BANNED" && (
            <button
              className={styles.enable}
              onClick={() => onStatusChange("unsuspend")}
            >
              Unban
            </button>
          )}

          <button className={styles.edit} onClick={onEdit}>
            Edit
          </button>
          <button className={styles.delete} onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
