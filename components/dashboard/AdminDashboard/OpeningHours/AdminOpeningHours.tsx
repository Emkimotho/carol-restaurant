// File: components/AdminDashboard/OpeningHours/AdminOpeningHours.tsx
"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { toast } from "react-toastify";
import { useOpeningHours } from "@/contexts/OpeningHoursContext";

interface DailyHours {
  open: string;
  close: string;
}

type HoursData = {
  [day: string]: DailyHours;
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AdminOpeningHours: React.FC = () => {
  const { openingHours, refreshHours } = useOpeningHours();
  const [formData, setFormData] = useState<HoursData>({});

  // Initialize form data when openingHours updates
  useEffect(() => {
    const initialData: HoursData = {};
    days.forEach((day) => {
      initialData[day] = openingHours[day] || { open: "09:00", close: "17:00" };
    });
    setFormData(initialData);
  }, [openingHours]);

  // Validate time in HH:mm 24-hour format or allow "closed"
  const validateTime = (time: string) => {
    if (time.toLowerCase() === "closed") return true;
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(time);
  };

  // Update form data on input change
  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    day: string,
    field: "open" | "close"
  ) => {
    setFormData((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: e.target.value,
      },
    }));
  };

  // Handle form submission with validations and API call
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate each day's opening and closing values
    for (const day of days) {
      const { open, close } = formData[day];
      if (!validateTime(open) || !validateTime(close)) {
        toast.error(`Invalid time format for ${day}. Use HH:mm or "Closed".`);
        return;
      }
      if (
        (open.toLowerCase() === "closed" && close.toLowerCase() !== "closed") ||
        (open.toLowerCase() !== "closed" && close.toLowerCase() === "closed")
      ) {
        toast.error(
          `For ${day}, if one field is "Closed", both must be "Closed".`
        );
        return;
      }
    }

    // Submit the form data to the API
    try {
      const res = await fetch("/api/openinghours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to update opening hours");
      }
      toast.success("Opening hours updated successfully");
      refreshHours();
    } catch (error) {
      console.error(error);
      toast.error("Error updating opening hours");
    }
  };

  return (
    <div className="admin-opening-hours container mx-auto p-4">
      <h2 className="text-2xl font-heading mb-4">
        Manage Restaurant Opening Hours
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {days.map((day) => (
          <div key={day} className="day-form border p-4 rounded shadow-sm">
            <h3 className="text-xl font-bold mb-2">{day}</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor={`${day}-open`} className="block font-semibold mb-1">
                  Open
                </label>
                <input
                  type="text"
                  id={`${day}-open`}
                  value={formData[day]?.open || ""}
                  onChange={(e) => handleChange(e, day, "open")}
                  placeholder='e.g. "09:00" or "Closed"'
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`${day}-close`} className="block font-semibold mb-1">
                  Close
                </label>
                <input
                  type="text"
                  id={`${day}-close`}
                  value={formData[day]?.close || ""}
                  onChange={(e) => handleChange(e, day, "close")}
                  placeholder='e.g. "17:00" or "Closed"'
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <button type="submit" className="btn">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminOpeningHours;
