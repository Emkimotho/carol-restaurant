// File: components/NeonSign/NeonSign.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useOpeningHours } from "../../contexts/OpeningHoursContext";
import { FaUtensils, FaStopCircle } from "react-icons/fa";
import styles from "./NeonSign.module.css";
import { convertTo12Hour } from "../../utils/timeUtils";

interface Status {
  isOpen: boolean;
  message: string;
}

const NeonSign: React.FC = () => {
  const { openingHours } = useOpeningHours();
  const [status, setStatus] = useState<Status>({ isOpen: false, message: "" });
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Listen for window resize to determine if the device is mobile.
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const checkStatus = () => {
      if (!openingHours || Object.keys(openingHours).length === 0) return;

      const now = new Date();
      // Use abbreviated day names (e.g., "Mon", "Tue", etc.)
      const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
      const currentTime = now.getHours() + now.getMinutes() / 60;
      const todayHours = openingHours[dayAbbr];

      if (todayHours && todayHours.open.toLowerCase() !== "closed") {
        const [openHourStr, openMinuteStr] = todayHours.open.split(":");
        const [closeHourStr, closeMinuteStr] = todayHours.close.split(":");
        const openTime = parseInt(openHourStr, 10) + parseInt(openMinuteStr, 10) / 60;
        const closeTime = parseInt(closeHourStr, 10) + parseInt(closeMinuteStr, 10) / 60;

        if (currentTime < openTime) {
          // Today is closed, but will open later.
          const fullMsg = `Closed. Opens later today at ${convertTo12Hour(todayHours.open)}.`;
          const mobileMsg = `Opens ${convertTo12Hour(todayHours.open)}.`;
          setStatus({ isOpen: false, message: isMobile ? mobileMsg : fullMsg });
          return;
        } else if (currentTime >= openTime && currentTime < closeTime) {
          // Restaurant is currently open.
          const fullMsg = `Open until ${convertTo12Hour(todayHours.close)}.`;
          const mobileMsg = `Open till ${convertTo12Hour(todayHours.close)}.`;
          setStatus({ isOpen: true, message: isMobile ? mobileMsg : fullMsg });
          return;
        }
      }
      // If today's hours indicate closed or we're past closing time, find the next open day.
      findNextOpening();
    };

    const findNextOpening = () => {
      const daysAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const currentDayIndex = new Date().getDay();
      let foundOpenDay = false;

      // Iterate through the next 6 days
      for (let i = 1; i < 7; i++) {
        const nextIndex = (currentDayIndex + i) % 7;
        const nextDayAbbr = daysAbbr[nextIndex];
        const nextHours = openingHours[nextDayAbbr];
        // Skip any day where open time is "Closed"
        if (nextHours && nextHours.open.toLowerCase() !== "closed") {
          const fullMsg = `We're closed now. Reopens on ${nextDayAbbr} at ${convertTo12Hour(nextHours.open)}.`;
          const mobileMsg = `Reopens ${nextDayAbbr} ${convertTo12Hour(nextHours.open)}.`;
          setStatus({ isOpen: false, message: isMobile ? mobileMsg : fullMsg });
          foundOpenDay = true;
          break;
        }
      }
      if (!foundOpenDay) {
        // No open day found in the next week.
        const fullMsg = "We're closed until further notice.";
        const mobileMsg = "Closed.";
        setStatus({ isOpen: false, message: isMobile ? mobileMsg : fullMsg });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, [openingHours, isMobile]);

  return (
    <div className={`${styles.neonSign} ${status.isOpen ? styles.open : styles.closed}`}>
      {status.isOpen ? (
        <div className={styles.statusContainer}>
          <FaUtensils className={styles.statusIcon} />
          <span className={styles.statusText}>{status.message}</span>
        </div>
      ) : (
        <div className={styles.statusContainer}>
          {/* On mobile, omit the icon when closed */}
          {isMobile ? (
            <span className={styles.statusText}>{status.message}</span>
          ) : (
            <>
              <FaStopCircle className={styles.statusIcon} />
              <span className={styles.statusText}>{status.message}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NeonSign;