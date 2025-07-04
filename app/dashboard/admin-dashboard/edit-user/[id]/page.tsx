/* ─────────────────────────────────────────────────────────────────────────────
 * File: app/dashboard/admin-dashboard/edit-user/[id]/page.tsx
 * ---------------------------------------------------------------------------
 * • Loads a user by ID and lets an admin edit details & roles.
 * • “ADMIN” role is always assignable (no super-admin gate).
 * • If you open **your own profile**, the ADMIN checkbox is shown but disabled
 *   so you can’t lock yourself out by un-checking it.
 * ------------------------------------------------------------------------- */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter }       from 'next/navigation';
import { useSession }                 from 'next-auth/react';
import { toast }                      from 'react-toastify';
import styles                         from './EditUser.module.css';

/* ─── Role types ─────────────────────────────────────────────────────────── */

type Role = 'ADMIN' | 'STAFF' | 'DRIVER' | 'SERVER' | 'CASHIER';
const ALL_ROLES: Role[] = ['ADMIN', 'STAFF', 'DRIVER', 'SERVER', 'CASHIER'];

/* ─── API payload shape ─────────────────────────────────────────────────── */

interface UserData {
  id:            number;
  firstName:     string;
  lastName:      string;
  email:         string;
  phone?:        string;
  position?:     string;
  roles:         Role[];
  licenseNumber?: string;
  carMakeModel?:  string;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function EditUserPage() {
  const { id }            = useParams<{ id: string }>();
  const router            = useRouter();
  const { data: session } = useSession();

  // ID of the *current* admin who is doing the editing
  const viewerId = (session?.user as any)?.id as number | undefined;

  const [user,   setUser]   = useState<UserData | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── 1. Fetch user on mount ───────────────────────────────────────────── */

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/users/${id}`, { credentials: 'include' });
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
          carMakeModel:  data.carMakeModel
        });
      } catch {
        toast.error('User not found');
        router.push('/dashboard/admin-dashboard/user-management');
      }
    })();
  }, [id, router]);

  /* ── 2. Helpers ───────────────────────────────────────────────────────── */

  const toggleRole = (role: Role) => {
    if (!user) return;
    const hasRole = user.roles.includes(role);
    setUser({
      ...user,
      roles: hasRole ? user.roles.filter(r => r !== role)
                     : [...user.roles, role]
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!res.ok) throw new Error();
      toast.success('User updated');
      router.push('/dashboard/admin-dashboard/user-management');
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  /* ── 3. Render ────────────────────────────────────────────────────────── */

  if (!user) return <p className={styles.loading}>Loading…</p>;

  return (
    <div className={styles.container}>
      <h1>Edit User</h1>

      <form className={styles.form} onSubmit={onSubmit}>
        {/* ─ Identity ─ */}
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

        {/* ─ Contact ─ */}
        <label>
          Phone
          <input
            value={user.phone ?? ''}
            onChange={e => setUser({ ...user, phone: e.target.value })}
          />
        </label>

        <label>
          Position
          <input
            value={user.position ?? ''}
            onChange={e => setUser({ ...user, position: e.target.value })}
            placeholder="e.g. Waitress"
          />
        </label>

        {/* ─ Roles ─ */}
        <fieldset className={styles.rolesFieldset}>
          <legend>Roles</legend>

          {ALL_ROLES.map(role => {
            const isSelfAdminBox =
              role === 'ADMIN' && user.id === viewerId;     // editing self
            return (
              <label key={role} className={styles.roleLabel}>
                <input
                  type="checkbox"
                  checked={user.roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  disabled={isSelfAdminBox}                  // prevent lock-out
                />{' '}
                {role}
                {isSelfAdminBox && (
                  <span className={styles.selfNote}> (you)</span>
                )}
              </label>
            );
          })}
        </fieldset>

        {/* ─ Driver extras ─ */}
        {user.roles.includes('DRIVER') && (
          <>
            <label>
              License Number
              <input
                value={user.licenseNumber ?? ''}
                onChange={e =>
                  setUser({ ...user, licenseNumber: e.target.value })
                }
                required
              />
            </label>

            <label>
              Car Make & Model
              <input
                value={user.carMakeModel ?? ''}
                onChange={e =>
                  setUser({ ...user, carMakeModel: e.target.value })
                }
                required
              />
            </label>
          </>
        )}

        {/* ─ Submit ─ */}
        <button disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
