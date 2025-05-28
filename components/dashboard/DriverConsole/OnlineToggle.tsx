// File: components/dashboard/DriverConsole/OnlineToggle.tsx
// ─ A small toggle button for drivers to mark themselves online/offline
//    by PATCHing /api/drivers/:id/status

'use client';

import React, { useState } from 'react';

interface OnlineToggleProps {
  /** The numeric ID of the current driver */
  driverId: number;
  /** Initial “online” state, e.g. fetched from server */
  initialOnline: boolean;
  /**
   * Optional callback if you need to refresh parent state
   * when the driver’s status changes.
   */
  onStatusChange?: (online: boolean) => void;
}

export default function OnlineToggle({
  driverId,
  initialOnline,
  onStatusChange,
}: OnlineToggleProps) {
  const [online, setOnline] = useState(initialOnline);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const newStatus = !online;
    setLoading(true);
    try {
      const res = await fetch(`/api/drivers/${driverId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus ? 'online' : 'offline' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOnline(newStatus);
      onStatusChange?.(newStatus);
    } catch (err) {
      console.error('Failed to update driver status', err);
      alert('Could not update your status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: '0.25rem',
        border: '1px solid var(--border-color-dark)',
        backgroundColor: online ? 'var(--primary-color)' : 'var(--secondary-color)',
        color: 'var(--white)',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading
        ? '…'
        : online
        ? 'Go Offline'
        : 'Go Online'}
    </button>
  );
}
