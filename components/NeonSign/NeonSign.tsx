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
      
      if (!todayHours || todayHours.open === 'Closed') {
        findNextOpening();
        return;
      }

      const [openHourStr, openMinuteStr] = todayHours.open.split(':');
      const [closeHourStr, closeMinuteStr] = todayHours.close.split(':');
      const openTime = parseInt(openHourStr, 10) + parseInt(openMinuteStr, 10) / 60;
      const closeTime = parseInt(closeHourStr, 10) + parseInt(closeMinuteStr, 10) / 60;

      if (currentTime >= openTime && currentTime < closeTime) {
        setStatus({
          isOpen: true,
          message: `Open until ${convertTo12Hour(todayHours.close)}`,
        });
      } else {
        findNextOpening();
      }
    };

    const findNextOpening = () => {
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let nextDayIndex = (new Date().getDay() + 1) % 7;

      for (let i = 0; i < 7; i++) {
        const nextDay = daysOfWeek[nextDayIndex];
        const nextHours = openingHours[nextDay];
        
        if (nextHours && nextHours.open !== 'Closed') {
          setStatus({
            isOpen: false,
            message: `Will open on ${nextDay} at ${convertTo12Hour(nextHours.open)}`,
          });
          return;
        }
        nextDayIndex = (nextDayIndex + 1) % 7;
      }

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
          <span>{status.message}</span>
        </div>
      ) : (
        <div className={styles.statusContainer}>
          <span>Closed</span>
          <FaStopCircle className={styles.statusIcon} />
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
};

export default NeonSign;
