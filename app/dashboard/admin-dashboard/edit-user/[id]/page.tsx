// File: app/dashboard/admin-dashboard/edit-user/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import styles from "./EditUser.module.css";

const ASSIGNABLE_ROLES = ["STAFF", "DRIVER", "SERVER", "CASHIER"] as const;
type AssignableRole = typeof ASSIGNABLE_ROLES[number];

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  roles: string[];
  licenseNumber?: string;
  carMakeModel?: string;
}

const EditUserPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [saving, setSaving] = useState(false);

  // Load user on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/users/${id}`, { credentials: "include" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUser({
          id:            data.id,
          firstName:     data.firstName,
          lastName:      data.lastName,
          email:         data.email,
          phone:         data.phone,
          position:      data.position,
          roles:         data.roles,
          licenseNumber: data.licenseNumber,
          carMakeModel:  data.carMakeModel,
        });
      } catch {
        toast.error("User not found");
        router.push("/dashboard/admin-dashboard/user-management");
      }
    };
    load();
  }, [id, router]);

  // Toggle any of the four roles
  const handleRoleToggle = (role: AssignableRole) => {
    if (!user) return;
    const has = user.roles.includes(role);
    setUser({
      ...user,
      roles: has
        ? user.roles.filter(r => r !== role)
        : [...user.roles, role],
    });
  };

  // Submit changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (!res.ok) throw new Error();
      toast.success("User updated");
      router.push("/dashboard/admin-dashboard/user-management");
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <p className={styles.loading}>Loading…</p>;

  return (
    <div className={styles.container}>
      <h1>Edit User</h1>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label>
          First Name
          <input
            value={user.firstName}
            onChange={e => setUser({ ...user, firstName: e.target.value })}
            required
          />
        </label>

        <label>
          Last Name
          <input
            value={user.lastName}
            onChange={e => setUser({ ...user, lastName: e.target.value })}
            required
          />
        </label>

        <label>
          Email (unchangeable)
          <input value={user.email} disabled />
        </label>

        <label>
          Phone
          <input
            value={user.phone ?? ""}
            onChange={e => setUser({ ...user, phone: e.target.value })}
          />
        </label>

        <label>
          Position
          <input
            value={user.position ?? ""}
            onChange={e => setUser({ ...user, position: e.target.value })}
            placeholder="e.g. Waitress"
          />
        </label>

        <fieldset className={styles.rolesFieldset}>
          <legend>Roles</legend>
          {ASSIGNABLE_ROLES.map(r => (
            <label key={r} className={styles.roleLabel}>
              <input
                type="checkbox"
                checked={user.roles.includes(r)}
                onChange={() => handleRoleToggle(r)}
              />{" "}
              {r}
            </label>
          ))}
        </fieldset>

        {user.roles.includes("DRIVER") && (
          <>
            <label>
              License Number
              <input
                value={user.licenseNumber ?? ""}
                onChange={e =>
                  setUser({ ...user, licenseNumber: e.target.value })
                }
                required
              />
            </label>
            <label>
              Car Make & Model
              <input
                value={user.carMakeModel ?? ""}
                onChange={e =>
                  setUser({ ...user, carMakeModel: e.target.value })
                }
                required
              />
            </label>
          </>
        )}

        <button disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default EditUserPage;
