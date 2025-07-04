/* ──────────────────────────────────────────────────────────────────────────────
 * File: components/dashboard/AdminDashboard/UserManagement/UserManagement.tsx
 * -----------------------------------------------------------------------------
 * Lists every non-super user in a responsive grid and lets an admin:
 *   • toggle any role (ADMIN, STAFF, DRIVER, SERVER, CASHIER)
 *   • suspend / unsuspend / ban users
 *   • open the full-edit page or delete a user
 * All server round-trips hit the `/api/users[…]` endpoints.
 * --------------------------------------------------------------------------- */

'use client';

import React, { useEffect, useState } from 'react';
import { toast }                       from 'react-toastify';

import UserCard                        from '../UserCard/UserCard';
import styles                          from './UserManagement.module.css';

/* ── Role literal-union used across the admin UI ───────────────────────────── */
export type Role = 'ADMIN' | 'STAFF' | 'DRIVER' | 'SERVER' | 'CASHIER';

/* ── Shape returned by GET /api/users ──────────────────────────────────────── */
interface DbUser {
  id:            number;
  email:         string;
  phone?:        string;
  firstName:     string;
  lastName:      string;
  status:        'ACTIVE' | 'SUSPENDED' | 'BANNED';
  roles:         Role[];
  position?:     string;
  staffProfile?: {
    photoPublicId?: string;
    photoUrl?:      string;
    position?:      string;
  };
  driverProfile?: {
    photoPublicId?: string;
    photoUrl?:      string;
    licenseNumber?: string;
    carMakeModel?:  string;
  };
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function UserManagement() {
  const [users,   setUsers]   = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(false);

  /* -- Fetch helpers -------------------------------------------------------- */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load users');
      const { users: raw } = await res.json();

      const mapped: DbUser[] = (raw as any[]).map((u) => {
        // Flatten the prisma shape → Role[]
        const roleNames: Role[] = Array.isArray(u.roles)
          ? u.roles.map((r: any) =>
              typeof r.name === 'string'
                ? r.name.toUpperCase()
                : r.role?.name.toUpperCase(),
            )
          : [];

        return {
          id:            u.id,
          email:         u.email,
          phone:         u.phone,
          firstName:     u.firstName,
          lastName:      u.lastName,
          status:        u.status,
          roles:         roleNames,
          position:      u.staffProfile?.position ?? '',
          staffProfile:  {
            photoPublicId: u.staffProfile?.photoPublicId,
            photoUrl:      u.staffProfile?.photoUrl,
            position:      u.staffProfile?.position,
          },
          driverProfile: {
            photoPublicId: u.driverProfile?.photoPublicId,
            photoUrl:      u.driverProfile?.photoUrl,
            licenseNumber: u.driverProfile?.licenseNumber,
            carMakeModel:  u.driverProfile?.carMakeModel,
          },
        };
      });

      setUsers(mapped);
    } catch (e: any) {
      toast.error(e.message || 'Could not fetch users');
    } finally {
      setLoading(false);
    }
  };

  /* initial load */
  useEffect(() => {
    fetchUsers();
  }, []);

  /* -- Mutations ------------------------------------------------------------ */
  const changeStatus = async (
    id: number,
    action: 'suspend' | 'unsuspend' | 'ban',
  ) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Status update failed');
      toast.success(`User ${action}ed`);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Deletion failed');
      toast.success('User deleted');
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const editUser = (id: number) =>
    (window.location.href = `/dashboard/admin-dashboard/edit-user/${id}`);

  const toggleRole = async (userId: number, role: Role) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const has = user.roles.includes(role);
    const newRoles = has
      ? user.roles.filter((r) => r !== role)
      : [...user.roles, role];

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: newRoles }),
      });
      if (!res.ok) throw new Error('Role update failed');
      toast.success('Role updated');
      fetchUsers();
    } catch {
      toast.error('Role update failed');
    }
  };

  /* -- Render --------------------------------------------------------------- */
  return (
    <div className={styles.userManagementContainer}>
      <h1 className={styles.title}>User Management</h1>

      {loading ? (
        <p>Loading users…</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className={styles.userGrid}>
          {users.map((u) => {
            const photoPublicId =
              u.staffProfile?.photoPublicId ?? u.driverProfile?.photoPublicId;
            const photoUrl =
              u.staffProfile?.photoUrl ?? u.driverProfile?.photoUrl;

            return (
              <UserCard
                key={u.id}
                id={u.id}
                name={`${u.firstName} ${u.lastName}`}
                email={u.email}
                phone={u.phone}
                position={u.position}
                roles={u.roles}
                status={u.status}
                photoPublicId={photoPublicId}
                photoUrl={photoUrl}
                licenseNumber={u.driverProfile?.licenseNumber}
                carMakeModel={u.driverProfile?.carMakeModel}
                onStatusChange={(action) => changeStatus(u.id, action)}
                onEdit={() => editUser(u.id)}
                onDelete={() => deleteUser(u.id)}
                onToggleRole={(role) => toggleRole(u.id, role)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
