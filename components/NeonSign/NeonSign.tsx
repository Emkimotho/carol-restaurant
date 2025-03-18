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
      const dayOfWeek = now.toLocaleString('en-US', { weekday: 'short' }); // e.g., "Mon"
      const currentTime = now.getHours() + now.getMinutes() / 60;
      const todayHours = openingHours[dayOfWeek];

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
          return;
        } else if (currentTime >= openTime && currentTime < closeTime) {
          setStatus({
            isOpen: true,
            message: `Open until ${convertTo12Hour(todayHours.close)}`,
          });
          return;
        }
      }
      // If today's hours are not available or current time is past closing, find the next opening
      findNextOpening();
    };

    const findNextOpening = () => {
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDayIndex = new Date().getDay();
      for (let i = 1; i < 7; i++) {
        const nextIndex = (currentDayIndex + i) % 7;
        const nextDay = daysOfWeek[nextIndex];
        const nextHours = openingHours[nextDay];
        if (nextHours && nextHours.open !== 'Closed') {
          setStatus({
            isOpen: false,
            message: `Will open ${nextDay} at ${convertTo12Hour(nextHours.open)}`,
          });
          return;
        }
      }
      setStatus({
        isOpen: false,
        message: 'Closed until further notice',
      });
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
          <span className={styles.statusText}>{status.message}</span>
        </div>
      ) : (
        <div className={styles.statusContainer}>
          <FaStopCircle className={styles.statusIcon} />
          <span className={styles.statusText}>{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default NeonSign;
