// File: contexts/OpeningHoursContext.tsx
// ======================================================================
//  Global context that keeps track of the restaurant’s opening hours and
//  whether the restaurant is currently open.
//
//  • Polls `/api/openinghours` once on mount and exposes a manual refresh.
//  • Calculates `isOpen` locally and updates it *only* when the value
//    actually changes, preventing pointless re-renders and endless logs.
//  • Exposes simple helpers for a “We’re closed” popup.
// ======================================================================

"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";

/* ----------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------- */

interface DailyHours {
  open: string;   // "HH:mm" in 24-hour time, or "Closed"
  close: string;  // "HH:mm"
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

/* ----------------------------------------------------------------------
 * Context
 * -------------------------------------------------------------------- */

export const OpeningHoursContext =
  createContext<OpeningHoursContextType | null>(null);

/* ----------------------------------------------------------------------
 * Provider
 * -------------------------------------------------------------------- */

export const OpeningHoursProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPopupVisible, setIsPopupVisible] = useState<boolean>(false);

  /* ------------------------------------------
   * 1. Fetch opening hours from the API
   * ---------------------------------------- */

  const fetchHours = async () => {
    try {
      const res = await fetch("/api/openinghours", { cache: "no-store" });
      console.log(
        "[OpeningHoursContext] /api/openinghours response:",
        res.status,
        res.statusText,
      );

      if (!res.ok) throw new Error("Failed to fetch opening hours");

      const data: OpeningHours = await res.json();

      setOpeningHours((prev) => {
        // prevent state updates when data hasn’t changed
        const changed =
          JSON.stringify(prev, null, 0) !== JSON.stringify(data, null, 0);
        if (changed) {
          console.log("[OpeningHoursContext] Fetched opening hours:", data);
          return data;
        }
        return prev;
      });
    } catch (error) {
      console.error("[OpeningHoursContext] Error fetching hours:", error);
    }
  };

  // Fetch once on mount
  useEffect(() => {
    fetchHours();
  }, []);

  // Allow consumers to force-refresh
  const refreshHours = () => fetchHours();

  /* ------------------------------------------
   * 2. Calculate whether the store is open
   * ---------------------------------------- */

  const isStoreCurrentlyOpen = () => {
    const now = new Date();
    const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
      now.getDay()
    ];

    const todaysHours = openingHours[dayAbbr];
    if (!todaysHours || todaysHours.open === "Closed") return false;

    const [openH, openM] = todaysHours.open.split(":").map(Number);
    const [closeH, closeM] = todaysHours.close.split(":").map(Number);

    const openTime = new Date(now);
    openTime.setHours(openH, openM, 0, 0);

    const closeTime = new Date(now);
    closeTime.setHours(closeH, closeM, 0, 0);

    return now >= openTime && now < closeTime;
  };

  // Re-evaluate open status when hours change and once per minute
  useEffect(() => {
    const updateStatus = () => {
      const current = isStoreCurrentlyOpen();
      setIsOpen((prev) => {
        if (prev !== current) {
          console.log("[OpeningHoursContext] Updating open status:", current);
          return current;
        }
        return prev;
      });
    };

    updateStatus(); // immediate
    const id = setInterval(updateStatus, 60_000); // every minute

    return () => clearInterval(id);
  }, [openingHours]);

  /* ------------------------------------------
   * 3. Popup helpers
   * ---------------------------------------- */

  const togglePopup = () =>
    setIsPopupVisible((prev) => {
      console.log("[OpeningHoursContext] Toggling popup. New value:", !prev);
      return !prev;
    });

  const showPopup = () => {
    console.log("[OpeningHoursContext] Forcing popup to show.");
    setIsPopupVisible(true);
  };

  /* ------------------------------------------
   * 4. Provider
   * ---------------------------------------- */

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

/* ----------------------------------------------------------------------
 * Hook
 * -------------------------------------------------------------------- */

export const useOpeningHours = () => {
  const ctx = useContext(OpeningHoursContext);
  if (!ctx)
    throw new Error("useOpeningHours must be used within an OpeningHoursProvider");
  return ctx;
};
