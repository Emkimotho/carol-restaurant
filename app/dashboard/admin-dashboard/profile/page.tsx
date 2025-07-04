// File: app/dashboard/admin-dashboard/profile/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from '@/components/dashboard/AdminDashboard/profile.module.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  streetAddress?: string | null;
  aptSuite?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  staffProfile?: { position?: string | null };
}

export default function AdminProfilePage() {
  // 1) NextAuth session & status
  const { data: session, status } = useSession();

  // 2) State hooks
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [phone, setPhone] = useState('');
  const [streetAddress, setStreet] = useState('');
  const [aptSuite, setAptSuite] = useState('');
  const [city, setCity] = useState('');
  const [stateField, setStateField] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [position, setPosition] = useState('');

  // 3) Determine admin role from session
  const isAdmin = Boolean(
    session?.user?.roles?.some(
      (r: string | null) => typeof r === 'string' && r.toLowerCase() === 'admin'
    )
  );

  // 4) Fetch profile when authenticated admin
  useEffect(() => {
    if (status !== 'authenticated' || !isAdmin) return;
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/profile');
        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: res.statusText }));
          throw new Error(err.message || 'Failed to load profile');
        }
        const { profile: p }: { profile: ProfileData } = await res.json();
        if (!mounted) return;

        setProfile(p);
        setPhone(p.phone ?? '');
        setStreet(p.streetAddress ?? '');
        setAptSuite(p.aptSuite ?? '');
        setCity(p.city ?? '');
        setStateField(p.state ?? '');
        setZip(p.zip ?? '');
        setCountry(p.country ?? '');
        setPosition(p.staffProfile?.position ?? '');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Could not load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [status, isAdmin]);

  // 5) Early renders
  if (status === 'loading') {
    return <p className={styles.loading}>Loading…</p>;
  }
  if (status === 'authenticated' && !isAdmin) {
    return <p className={styles.error}>Access denied</p>;
  }
  if (loading && !profile) {
    return <p className={styles.loading}>Loading profile…</p>;
  }

  // 6) Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          streetAddress,
          aptSuite,
          city,
          state: stateField,
          zip,
          country,
          position,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || 'Update failed');
      }
      const { profile: updated }: { profile: ProfileData } = await res.json();
      setProfile(updated);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  // 7) Main UI
  return (
    <div className={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} />

      <h2 className={styles.heading}>Admin Profile</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Read-only */}
        <div className={styles.group}>
          <label>First Name</label>
          <input type="text" value={profile?.firstName ?? ''} disabled />
        </div>
        <div className={styles.group}>
          <label>Last Name</label>
          <input type="text" value={profile?.lastName ?? ''} disabled />
        </div>
        <div className={styles.group}>
          <label>Email</label>
          <input type="email" value={profile?.email ?? ''} disabled />
        </div>

        {/* Editable */}
        <div className={styles.group}>
          <label>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className={styles.group}>
          <label>Street Address</label>
          <input
            value={streetAddress}
            onChange={(e) => setStreet(e.target.value)}
          />
        </div>
        <div className={styles.group}>
          <label>Apt / Suite</label>
          <input
            value={aptSuite}
            onChange={(e) => setAptSuite(e.target.value)}
          />
        </div>
        <div className={styles.group}>
          <label>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className={styles.group}>
          <label>State</label>
          <input
            value={stateField}
            onChange={(e) => setStateField(e.target.value)}
          />
        </div>
        <div className={styles.group}>
          <label>Zip</label>
          <input value={zip} onChange={(e) => setZip(e.target.value)} />
        </div>
        <div className={styles.group}>
          <label>Country</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
        <div className={styles.group}>
          <label>Position</label>
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={loading}
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
