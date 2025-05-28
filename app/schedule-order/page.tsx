"use client";

import React, { useState, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { OrderContext } from "@/contexts/OrderContext";
import { useOpeningHours } from "@/contexts/OpeningHoursContext";
import styles from "./schedule.module.css";
import { convertTo12Hour } from "../../utils/timeUtils"; // Utility: "09:00" → "9:00 AM"

/**
 * Helper: Convert a 12-hour time string (e.g., "9:00 AM")
 * into an object with hour and minute in 24-hour format.
 */
const parseTime12Hour = (timeStr: string): { hour: number; minute: number } => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (modifier.toUpperCase() === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }
  return { hour: hours, minute: minutes };
};

const ScheduleOrderPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get returnUrl from the query parameter; if none provided, default to "/menu".
  let returnUrl = searchParams.get("returnUrl") || "/menu";

  // If the returnUrl mistakenly points to a sub-route that doesn't exist, correct it.
  if (returnUrl === "/checkout/summary") {
    returnUrl = "/checkout?step=orderSummary";
  }

  // OrderContext: used to set the scheduled time.
  const orderContext = useContext(OrderContext);
  if (!orderContext) {
    throw new Error("OrderContext must be used within an OrderProvider");
  }
  const { setSchedule } = orderContext;

  // OpeningHoursContext: used to determine available days and time slots.
  const { openingHours } = useOpeningHours();

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  // selectedTime stores a formatted 12-hour time string (e.g., "9:00 AM")
  const [selectedTime, setSelectedTime] = useState<string>("");
  // currentStep: 1 => Choose Day; 2 => Choose Time
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Generate an array of the next 7 days based on opening hours.
  const daysToShow = Array.from({ length: 7 })
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    })
    .filter((day) => {
      const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day.getDay()];
      const dayHours = openingHours[dayAbbr];
      if (!dayHours) return false;
      if (
        dayHours.open.toLowerCase().includes("closed") ||
        dayHours.close.toLowerCase().includes("closed")
      ) {
        return false;
      }
      // For today, ensure we haven't passed the closing time.
      const now = new Date();
      if (day.toDateString() === now.toDateString()) {
        const [closeHour, closeMin] = dayHours.close.split(":").map(Number);
        const closeTime = new Date(now);
        closeTime.setHours(closeHour, closeMin, 0, 0);
        if (now >= closeTime) return false;
      }
      return true;
    });

  const handleSelectDay = (day: Date) => {
    setSelectedDay(day);
    setSelectedTime("");
    setErrorMsg("");
  };

  // Generate 30-minute time slots for the chosen day.
  const getTimeSlots = (date: Date): string[] => {
    const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    const dayHours = openingHours[dayAbbr];
    if (!dayHours) return [];
    if (
      dayHours.open.toLowerCase().includes("closed") ||
      dayHours.close.toLowerCase().includes("closed")
    ) {
      return [];
    }

    const [openHour, openMin] = dayHours.open.split(":").map(Number);
    const [closeHour, closeMin] = dayHours.close.split(":").map(Number);

    const slots: string[] = [];
    const current = new Date(date);
    current.setHours(openHour, openMin, 0, 0);
    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMin, 0, 0);

    while (current < closeTime) {
      const timeStr = `${current.getHours().toString().padStart(2, "0")}:${current
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      slots.push(convertTo12Hour(timeStr));
      current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setErrorMsg("");
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!selectedDay) {
        setErrorMsg("Please select a day first.");
        toast.error("Please select a day first.");
        return;
      }
      setCurrentStep(2);
    } else {
      if (!selectedTime) {
        setErrorMsg("Please select a valid time slot.");
        toast.error("Please select a valid time slot.");
        return;
      }
      // TS-safe assertion: we know selectedDay is non-null by this step
      const scheduledDate = new Date(selectedDay!);
      const { hour, minute } = parseTime12Hour(selectedTime);
      scheduledDate.setHours(hour, minute, 0, 0);

      if (scheduledDate <= new Date()) {
        setErrorMsg("Please choose a future time slot.");
        toast.error("Please choose a future time slot.");
        return;
      }
      console.log(
        "[ScheduleOrderPage] Confirming schedule at",
        scheduledDate.toISOString()
      );
      // Save the scheduled time in OrderContext.
      setSchedule(scheduledDate.toISOString(), "scheduled_pickup");

      console.log("Redirecting to returnUrl:", returnUrl);
      router.push(returnUrl);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      router.push(returnUrl);
    }
  };

  const renderStep = () => {
    if (currentStep === 1) {
      return (
        <div className={styles.dayGrid}>
          {daysToShow.length === 0 && (
            <p style={{ textAlign: "center" }}>
              No open days available in the next 7 days.
            </p>
          )}
          {daysToShow.map((day) => {
            const isSelected =
              selectedDay && day.toDateString() === selectedDay.toDateString();
            return (
              <div
                key={day.toDateString()}
                className={`${styles.dayCard} ${
                  isSelected ? styles.dayCardSelected : ""
                }`}
                onClick={() => handleSelectDay(day)}
              >
                {day.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            );
          })}
        </div>
      );
    } else {
      if (!selectedDay) return null;
      const slots = getTimeSlots(selectedDay);
      return (
        <div className={styles.timeGrid}>
          {slots.map((slot) => {
            const potentialDate = new Date(selectedDay!);
            const { hour, minute } = parseTime12Hour(slot);
            potentialDate.setHours(hour, minute, 0, 0);
            const isPast = potentialDate < new Date();
            const isSelected = slot === selectedTime;
            return (
              <div
                key={slot}
                className={`${styles.timeSlot} ${
                  isPast ? styles.timeSlotClosed : ""
                } ${
                  isSelected ? styles.timeSlotSelected : ""
                }`}
                onClick={() => {
                  if (!isPast) handleSelectTime(slot);
                }}
              >
                {slot}
              </div>
            );
          })}
        </div>
      );
    }
  };

  return (
    <div className={styles.scheduleContainer}>
      <div className={styles.stepIndicator}>
        <div
          className={`${styles.stepItem} ${
            currentStep === 1 ? styles.stepItemActive : ""
          }`}
        >
          1
        </div>
        <div className={styles.stepLabel}>Choose Day</div>
        <div
          className={`${styles.stepItem} ${
            currentStep === 2 ? styles.stepItemActive : ""
          }`}
        >
          2
        </div>
        <div className={styles.stepLabel}>Choose Time</div>
      </div>

      <h2 className={styles.scheduleHeading}>Schedule Your Order</h2>
      <p className={styles.scheduleIntro}>
        Select a future day and time—even if we are open now. Plan ahead for
        your convenience!
      </p>

      {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}

      {renderStep()}

      <div className={styles.scheduleActions}>
        <button className={styles.btnCancel} onClick={handleBack}>
          {currentStep === 1 ? "Cancel" : "Back"}
        </button>
        <button className={styles.btnPrimary} onClick={handleNext}>
          {currentStep === 1 ? "Next" : "Confirm"}
        </button>
      </div>
    </div>
  );
};

export default ScheduleOrderPage;
