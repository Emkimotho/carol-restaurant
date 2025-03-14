"use client";

import React, { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { OrderContext } from "@/contexts/OrderContext";
import { useOpeningHours } from "@/contexts/OpeningHoursContext";
import styles from "./schedule.module.css";

const ScheduleOrderPage: React.FC = () => {
  const router = useRouter();

  // OrderContext
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("OrderContext must be used within an OrderProvider");
  }
  const { order, setSchedule } = context;

  // OpeningHoursContext
  const { openingHours } = useOpeningHours();

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [errorMsg, setErrorMsg] = useState("");

  /**
   * Generate an array of the next 7 days.
   * Then filter out days that are "closed" or where we've already passed the close time for today.
   */
  const daysToShow = Array.from({ length: 7 })
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    })
    .filter((day) => {
      const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
        day.getDay()
      ];
      const dayHours = openingHours[dayAbbr];
      if (!dayHours || dayHours.open === "Closed") return false;

      const now = new Date();
      const sameDay = day.toDateString() === now.toDateString();

      if (sameDay) {
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

  const getTimeSlots = (date: Date): string[] => {
    const dayAbbr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
      date.getDay()
    ];
    const dayHours = openingHours[dayAbbr];
    if (!dayHours || dayHours.open === "Closed") return [];

    const [openHour, openMin] = dayHours.open.split(":").map(Number);
    const [closeHour, closeMin] = dayHours.close.split(":").map(Number);

    const slots: string[] = [];
    let current = new Date(date);
    current.setHours(openHour, openMin, 0, 0);

    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMin, 0, 0);

    while (current < closeTime) {
      const hh = current.getHours().toString().padStart(2, "0");
      const mm = current.getMinutes().toString().padStart(2, "0");
      slots.push(`${hh}:${mm}`);
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
        return;
      }
      setCurrentStep(2);
    } else {
      if (!selectedTime) {
        setErrorMsg("Please select a valid time slot.");
        return;
      }

      const scheduledDate = new Date(selectedDay);
      const [hourStr, minStr] = selectedTime.split(":");
      scheduledDate.setHours(Number(hourStr), Number(minStr), 0, 0);

      if (scheduledDate <= new Date()) {
        setErrorMsg("Please choose a future time slot.");
        return;
      }

      console.log("[ScheduleOrderPage] Confirming schedule at", scheduledDate.toISOString());
      setSchedule(scheduledDate.toISOString(), "scheduled_pickup");
      router.push("/menu");
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      router.push("/menu");
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
                className={`${styles.dayCard} ${isSelected ? styles.dayCardSelected : ""}`}
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
            const isSelected = slot === selectedTime;
            const potDate = new Date(selectedDay);
            const [hh, mm] = slot.split(":");
            potDate.setHours(Number(hh), Number(mm), 0, 0);
            const isPast = potDate < new Date();

            return (
              <div
                key={slot}
                className={`${styles.timeSlot}
                  ${isPast ? styles.timeSlotClosed : ""}
                  ${isSelected ? styles.timeSlotSelected : ""}`}
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
          className={`${styles.stepItem} ${currentStep === 1 ? styles.stepItemActive : ""}`}
        >
          1
        </div>
        <div className={styles.stepLabel}>Choose Day</div>
        <div
          className={`${styles.stepItem} ${currentStep === 2 ? styles.stepItemActive : ""}`}
        >
          2
        </div>
        <div className={styles.stepLabel}>Choose Time</div>
      </div>

      <h2 className={styles.scheduleHeading}>Schedule Your Order</h2>
      <p className={styles.scheduleIntro}>
        Select a future day and time—even if we are open now. Plan ahead for your convenience!
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
