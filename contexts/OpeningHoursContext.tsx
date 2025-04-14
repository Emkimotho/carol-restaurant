// File: contexts/OpeningHoursContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext } from "react";

interface DailyHours {
  open: string;
  close: string;
}

export interface OpeningHours {
  [day: string]: DailyHours;
}

interface OpeningHoursContextType {
  openingHours: OpeningHours;
  isOpen: boolean;
  isPopupVisible: boolean;
  togglePopup: () => void;
  showPopup: () => void;
  refreshHours: () => void;
}

export const OpeningHoursContext = createContext<OpeningHoursContextType | null>(null);

export const OpeningHoursProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);

  const fetchHours = async () => {
    try {
      const res = await fetch("/api/openinghours");
      // Debug log to see the response status
      console.log("[OpeningHoursContext] /api/openinghours response:", res.status, res.statusText);

      if (!res.ok) {
        throw new Error("Failed to fetch opening hours");
      }
      const data: OpeningHours = await res.json();
      setOpeningHours(data);
      console.log("[OpeningHoursContext] Fetched opening hours:", data);
    } catch (error) {
      console.error("[OpeningHoursContext] Error fetching hours:", error);
    }
  };

  // Fetch on initial mount
  useEffect(() => {
    fetchHours();
  }, []);

  const refreshHours = () => {
    fetchHours();
  };

  const checkIsOpen = () => {
    const now = new Date();
    const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
    const todaysHours = openingHours[dayAbbr];
    if (!todaysHours || todaysHours.open === "Closed") return false;

    const [openHour, openMinute] = todaysHours.open.split(":").map(Number);
    const [closeHour, closeMinute] = todaysHours.close.split(":").map(Number);

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

    // Re-check every minute
    const intervalId = setInterval(updateStatus, 60000);
    return () => clearInterval(intervalId);
  }, [openingHours]);

  const togglePopup = () => {
    setIsPopupVisible((prev) => {
      console.log("[OpeningHoursContext] Toggling popup. New value:", !prev);
      return !prev;
    });
  };

  const showPopup = () => {
    console.log("[OpeningHoursContext] Forcing popup to show.");
    setIsPopupVisible(true);
  };

  return (
    <OpeningHoursContext.Provider
      value={{
        openingHours,
        isOpen,
        isPopupVisible,
        togglePopup,
        showPopup,
        refreshHours,
      }}
    >
      {children}
    </OpeningHoursContext.Provider>
  );
};

export const useOpeningHours = () => {
  const context = useContext(OpeningHoursContext);
  if (!context) {
    throw new Error("useOpeningHours must be used within an OpeningHoursProvider");
  }
  return context;
};
