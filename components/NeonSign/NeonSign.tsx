"use client";

import React, { useEffect, useState } from 'react';
import { useOpeningHours } from '../../contexts/OpeningHoursContext';
import { FaUtensils, FaStopCircle } from 'react-icons/fa';
import styles from './NeonSign.module.css';
import { convertTo12Hour } from '../../utils/timeUtils';

interface Status {
  isOpen: boolean;
  message: string;
}

const NeonSign: React.FC = () => {
  const { openingHours } = useOpeningHours();
  const [status, setStatus] = useState<Status>({ isOpen: false, message: '' });

  useEffect(() => {
    const checkStatus = () => {
      if (!openingHours || Object.keys(openingHours).length === 0) return;

      const now = new Date();
      const dayOfWeek = now.toLocaleString('en-US', { weekday: 'short' });
      const currentTime = now.getHours() + now.getMinutes() / 60;
      const todayHours = openingHours[dayOfWeek];

      // If there are opening hours for today and the day is not "Closed"
      if (todayHours && todayHours.open !== 'Closed') {
        const [openHourStr, openMinuteStr] = todayHours.open.split(':');
        const [closeHourStr, closeMinuteStr] = todayHours.close.split(':');
        const openTime = parseInt(openHourStr, 10) + parseInt(openMinuteStr, 10) / 60;
        const closeTime = parseInt(closeHourStr, 10) + parseInt(closeMinuteStr, 10) / 60;

        if (currentTime < openTime) {
          // Restaurant will open later today
          setStatus({
            isOpen: false,
            message: `Opens today at ${convertTo12Hour(todayHours.open)}`,
          });
        } else if (currentTime >= openTime && currentTime < closeTime) {
          // Restaurant is currently open
          setStatus({
            isOpen: true,
            message: `Open until ${convertTo12Hour(todayHours.close)}`,
          });
        } else {
          // Already past closing time; look for the next opening
          findNextOpening();
        }
      } else {
        // No opening hours for today or marked as closed, so find next available opening
        findNextOpening();
      }
    };

    const findNextOpening = () => {
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let currentDayIndex = new Date().getDay();
      
      // Look ahead for the next day with valid opening hours
      for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (currentDayIndex + i) % 7;
        const nextDay = daysOfWeek[nextDayIndex];
        const nextHours = openingHours[nextDay];
        if (nextHours && nextHours.open !== 'Closed') {
          const openTimeStr = convertTo12Hour(nextHours.open);
          setStatus({
            isOpen: false,
            message: nextDay === daysOfWeek[currentDayIndex + 1] && i === 1
              ? `Opens today at ${openTimeStr}` // if the very next slot is still today (edge case)
              : `Opens on ${nextDay} at ${openTimeStr}`,
          });
          return;
        }
      }
      // Fallback message if no openings are found
      setStatus({ isOpen: false, message: 'Closed until further notice' });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [openingHours]);

  return (
    <div className={`${styles.neonSign} ${status.isOpen ? styles.open : styles.closed}`}>
      {status.isOpen ? (
        <div className={styles.statusContainer}>
          <FaUtensils className={styles.statusIcon} />
          <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{status.message}</span>
        </div>
      ) : (
        <div className={styles.statusContainer}>
          <FaStopCircle className={styles.statusIcon} />
          <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default NeonSign;
