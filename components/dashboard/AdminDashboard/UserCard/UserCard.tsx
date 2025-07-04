/* ──────────────────────────────────────────────────────────────────────────
   File: components/dashboard/AdminDashboard/UserCard/UserCard.tsx
   Purpose: Compact card for each user in the Admin → User-Management grid.
            • Shows avatar, key details and role toggles (now includes ADMIN)
            • Allows status changes, edit & delete actions via callbacks
   ────────────────────────────────────────────────────────────────────────*/
"use client";

import React from "react";
import Image                        from "next/image";
import styles                       from "./UserCard.module.css";
import { getCloudinaryImageUrl }    from "@/lib/cloudinary-client";

/* ---------------------------------------------------------------------- */
/*  Types                                                                 */
/* ---------------------------------------------------------------------- */
export type Role =
  | "ADMIN"
  | "STAFF"
  | "DRIVER"
  | "SERVER"
  | "CASHIER";

export interface UserCardProps {
  id:            number;
  name:          string;
  email:         string;
  phone?:        string;
  position?:     string;
  roles:         Role[];                 // e.g. ["ADMIN","STAFF",…]
  status:        "ACTIVE" | "SUSPENDED" | "BANNED";

  /** Cloudinary public ID (preferred) */
  photoPublicId?: string;
  /** Fallback absolute/relative URL */
  photoUrl?:       string;

  /* driver extras (optional) */
  licenseNumber?:  string;
  carMakeModel?:   string;

  /* callbacks passed down from parent component */
  onEdit:          () => void;
  onDelete:        () => void;
  onStatusChange:  (action: "suspend" | "unsuspend" | "ban") => void;
  onToggleRole:    (role: Role) => void;
}

/* ---------------------------------------------------------------------- */
/*  Constants                                                              */
/* ---------------------------------------------------------------------- */
const ASSIGNABLE_ROLES: Role[] = [
  "ADMIN",
  "STAFF",
  "DRIVER",
  "SERVER",
  "CASHIER",
];

/* ---------------------------------------------------------------------- */
/*  Component                                                              */
/* ---------------------------------------------------------------------- */
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
  /* ------------- Compute avatar source ------------- */
  let avatarSrc: string | undefined;
  let unoptimized = false;           // opt-out of Next optimisation for Cloudinary

  if (photoPublicId) {
    avatarSrc   = getCloudinaryImageUrl(photoPublicId, 120, 120);
    unoptimized = true;
  } else if (photoUrl) {
    avatarSrc = photoUrl;
  }

  /* ------------- JSX ------------- */
  return (
    <div className={styles.card}>
      {/* Avatar ----------------------------------------------------------- */}
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

      {/* Info ------------------------------------------------------------- */}
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

        {/* Role check-boxes ---------------------------------------------- */}
        <div className={styles.roleToggles}>
          {ASSIGNABLE_ROLES.map(role => (
            <label key={role} className={styles.roleLabel}>
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={() => onToggleRole(role)}
              />{" "}
              {role}
            </label>
          ))}
        </div>
      </div>

      {/* Action buttons ---------------------------------------------------- */}
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

          <button className={styles.edit}   onClick={onEdit}>   Edit   </button>
          <button className={styles.delete} onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
