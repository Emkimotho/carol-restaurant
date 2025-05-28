// File: components/dashboard/AdminDashboard/UserManagement/UserManagement.tsx
"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import UserCard from "../UserCard/UserCard";
import styles from "./UserManagement.module.css";

interface DbUser {
  id: number;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  roles: string[];
  position?: string;
  staffProfile?: { photoUrl?: string; position?: string };
  driverProfile?: {
    photoUrl?: string;
    licenseNumber?: string;
    carMakeModel?: string;
  };
}

const UserManagement: React.FC = () => {
  const [users, setUsers]     = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all non-admin users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load users");
      const { users: raw } = await res.json();

      const mapped = (raw as any[])
        .map((u) => ({
          id:            u.id,
          email:         u.email,
          phone:         u.phone,
          firstName:     u.firstName,
          lastName:      u.lastName,
          status:        u.status,
          roles:         u.roles.map((r: any) => r.role.name),
          position:      u.staffProfile?.position ?? "",
          staffProfile:  u.staffProfile,
          driverProfile: u.driverProfile,
        }))
        // just in case: filter out any remaining ADMIN
        .filter((u) => !u.roles.includes("ADMIN"));

      setUsers(mapped);
    } catch (e: any) {
      toast.error(e.message || "Could not fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Suspend / unsuspend / ban
  const changeStatus = async (
    id: number,
    action: "suspend" | "unsuspend" | "ban"
  ) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Status update failed");
      toast.success(`User ${action}ed`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete
  const deleteUser = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Deletion failed");
      toast.success("User deleted");
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Navigate to edit page
  const editUser = (id: number) =>
    (window.location.href = `/dashboard/admin-dashboard/edit-user/${id}`);

  // Toggle role (will re‐POST full roles array)
  const toggleRole = async (userId: number, role: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const has = user.roles.includes(role);
    const newRoles = has
      ? user.roles.filter((r) => r !== role)
      : [...user.roles, role];

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: newRoles }),
      });
      if (!res.ok) throw new Error("Role update failed");
      toast.success("Role updated");
      fetchUsers();
    } catch {
      toast.error("Role update failed");
    }
  };

  return (
    <div className={styles.userManagementContainer}>
      <h1 className={styles.title}>User Management</h1>

      {loading ? (
        <p>Loading users…</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className={styles.userGrid}>
          {users.map((u) => (
            <UserCard
              key={u.id}
              id={u.id}
              name={`${u.firstName} ${u.lastName}`}
              email={u.email}
              phone={u.phone}
              position={u.position}
              roles={u.roles}
              status={u.status}
              photoUrl={u.staffProfile?.photoUrl ?? u.driverProfile?.photoUrl}
              // **Pass driver fields explicitly**
              licenseNumber={u.driverProfile?.licenseNumber}
              carMakeModel={u.driverProfile?.carMakeModel}
              onStatusChange={(action) => changeStatus(u.id, action)}
              onEdit={() => editUser(u.id)}
              onDelete={() => deleteUser(u.id)}
              onToggleRole={(role) => toggleRole(u.id, role)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
