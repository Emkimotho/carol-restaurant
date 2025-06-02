/* ======================================================================
 * File: components/dashboard/AdminDashboard/OpeningHours/AdminOpeningHours.tsx
 * ----------------------------------------------------------------------
 * Manage restaurant opening hours – sleek, CSS‑module version.
 * -------------------------------------------------------------------*/

'use client';

import React, {
  useState,
  useEffect,
  ChangeEvent,
  FormEvent,
} from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useOpeningHours } from '@/contexts/OpeningHoursContext';
import styles from './AdminOpeningHours.module.css';

/* ---------------- Types ---------------- */
interface DailyHours {
  open: string;
  close: string;
}
type HoursData = Record<string, DailyHours>;

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AdminOpeningHours: React.FC = () => {
  const { openingHours, refreshHours } = useOpeningHours();
  const [formData, setFormData] = useState<HoursData>({});

  /* ----------- init local state from context ------------ */
  useEffect(() => {
    const init: HoursData = {};
    days.forEach(day => {
      init[day] = openingHours[day] || { open: '09:00', close: '17:00' };
    });
    setFormData(init);
  }, [openingHours]);

  /* ----------- helpers ---------------------------------- */
  const validTime = (val: string) =>
    val.toLowerCase() === 'closed' ||
    /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    day: string,
    field: 'open' | 'close'
  ) => {
    setFormData(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: e.target.value },
    }));
  };

  /* ----------- submit ----------------------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // validation
    for (const day of days) {
      const { open, close } = formData[day];
      if (!validTime(open) || !validTime(close)) {
        toast.error(`Invalid time for ${day}. Use HH:mm or "Closed".`);
        return;
      }
      if (
        (open.toLowerCase() === 'closed') !==
        (close.toLowerCase() === 'closed')
      ) {
        toast.error(`For ${day}, both fields must be "Closed" or neither.`);
        return;
      }
    }

    try {
      const res = await fetch('/api/openinghours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to update opening hours');
      toast.success('Opening hours updated successfully');
      refreshHours();
    } catch (err) {
      console.error(err);
      toast.error('Error updating opening hours');
    }
  };

  /* ----------- render ----------------------------------- */
  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Manage Restaurant Opening Hours</h2>

      <form className={styles.form} onSubmit={handleSubmit}>
        {days.map(day => (
          <div key={day} className={styles.dayCard}>
            <h3 className={styles.dayTitle}>{day}</h3>

            <div className={styles.inputGroup}>
              {/* Open */}
              <div style={{ flex: 1 }}>
                <label
                  htmlFor={`${day}-open`}
                  className={styles.label}
                >
                  Open
                </label>
                <input
                  id={`${day}-open`}
                  type="text"
                  className={styles.timeInput}
                  value={formData[day]?.open || ''}
                  placeholder='e.g. "09:00" or "Closed"'
                  onChange={e => handleChange(e, day, 'open')}
                  required
                />
              </div>

              {/* Close */}
              <div style={{ flex: 1 }}>
                <label
                  htmlFor={`${day}-close`}
                  className={styles.label}
                >
                  Close
                </label>
                <input
                  id={`${day}-close`}
                  type="text"
                  className={styles.timeInput}
                  value={formData[day]?.close || ''}
                  placeholder='e.g. "17:00" or "Closed"'
                  onChange={e => handleChange(e, day, 'close')}
                  required
                />
              </div>
            </div>
          </div>
        ))}

        <button type="submit" className={styles.submitBtn}>
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default AdminOpeningHours;
