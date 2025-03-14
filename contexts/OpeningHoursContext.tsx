// File: contexts/OpeningHoursContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext } from "react";

interface DailyHours {
  open: string;
  close: string;
}

interface OpeningHours {
  [day: string]: DailyHours;
}

interface OpeningHoursContextType {
  openingHours: OpeningHours;
  isOpen: boolean;
  isPopupVisible: boolean;
  togglePopup: () => void;
  showPopup: () => void;
}

export const OpeningHoursContext = createContext<OpeningHoursContextType | null>(null);

export const OpeningHoursProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);

  useEffect(() => {
    const hours: OpeningHours = {
      Sun: { open: '18:00', close: '23:55' },
      Mon: { open: '09:00', close: '20:00' },
      Tue: { open: '09:00', close: '23:00' },
      Wed: { open: '09:00', close: '23:58' },
      Thu: { open: '09:00', close: '17:00' },
      Fri: { open: '09:00', close: '17:00' },
      Sat: { open: '10:00', close: '14:00' },
    };
    setOpeningHours(hours);
    console.log("[OpeningHoursContext] Opening hours set:", hours);
  }, []);

  const checkIsOpen = () => {
    const now = new Date();
    const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
    const todaysHours = openingHours[dayAbbr];
    if (!todaysHours || todaysHours.open === 'Closed') return false;
    const [openHour, openMinute] = todaysHours.open.split(':').map(Number);
    const [closeHour, closeMinute] = todaysHours.close.split(':').map(Number);
    const openTime = new Date(now);
    openTime.setHours(openHour, openMinute, 0, 0);
    const closeTime = new Date(now);
    closeTime.setHours(closeHour, closeMinute, 0, 0);
    return now >= openTime && now < closeTime;
  };

  useEffect(() => {
    const updateStatus = () => {
      const openStatus = checkIsOpen();
      console.log("[OpeningHoursContext] Updating open status:", openStatus);
      setIsOpen(openStatus);
    };
    updateStatus();
    const intervalId = setInterval(updateStatus, 60000);
    return () => clearInterval(intervalId);
  }, [openingHours]);

  const togglePopup = () => {
    setIsPopupVisible((prev) => {
      console.log("[OpeningHoursContext] Toggling popup. New value:", !prev);
      return !prev;
    });
  };

  // Function to explicitly show the popup.
  const showPopup = () => {
    console.log("[OpeningHoursContext] Forcing popup to show.");
    setIsPopupVisible(true);
  };

  return (
    <OpeningHoursContext.Provider value={{ openingHours, isOpen, isPopupVisible, togglePopup, showPopup }}>
      {children}
    </OpeningHoursContext.Provider>
  );
};

export const useOpeningHours = () => {
  const context = useContext(OpeningHoursContext);
  if (!context) {
    throw new Error('useOpeningHours must be used within an OpeningHoursProvider');
  }
  return context;
};
