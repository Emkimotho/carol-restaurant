"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";

// Helper: Convert a number to a fixed 2-decimal string
function toTwoDecimalStr(num: number | undefined | null): string {
  if (num === undefined || num === null) return "0.00";
  return num.toFixed(2);
}

export interface DeliveryCharges {
  ratePerMile: string;
  ratePerHour: string;
  restaurantFeePercentage: string;
  minimumCharge: string;
  freeDeliveryThreshold: string;
}

export interface DeliveryChargesContextProps {
  deliveryCharges: DeliveryCharges;
  updateDeliveryCharges: (newCharges: DeliveryCharges) => Promise<void>;
  loading: boolean;
  error?: string;
}

export const DeliveryChargesContext = createContext<DeliveryChargesContextProps>({
  deliveryCharges: {
    ratePerMile: "0.00",
    ratePerHour: "0.00",
    restaurantFeePercentage: "0.00",
    minimumCharge: "0.00",
    freeDeliveryThreshold: "0.00",
  },
  updateDeliveryCharges: async () => {},
  loading: false,
});

interface ProviderProps {
  children: ReactNode;
}

const DeliveryChargesProvider: React.FC<ProviderProps> = ({ children }) => {
  const [deliveryCharges, setDeliveryCharges] = useState<DeliveryCharges>({
    ratePerMile: "0.00",
    ratePerHour: "0.00",
    restaurantFeePercentage: "0.00",
    minimumCharge: "0.00",
    freeDeliveryThreshold: "0.00",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Fetch DeliveryCharges from the API on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("[DeliveryChargesProvider] Fetching from /api/deliverycharges...");
        const res = await fetch("/api/deliverycharges");
        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }
        const data = await res.json();
        console.log("[DeliveryChargesProvider] Received data:", data);

        // Convert the floats into two-decimal strings
        setDeliveryCharges({
          ratePerMile: toTwoDecimalStr(parseFloat(data.ratePerMile)),
          ratePerHour: toTwoDecimalStr(parseFloat(data.ratePerHour)),
          restaurantFeePercentage: toTwoDecimalStr(parseFloat(data.restaurantFeePercentage)),
          minimumCharge: toTwoDecimalStr(parseFloat(data.minimumCharge)),
          freeDeliveryThreshold: toTwoDecimalStr(parseFloat(data.freeDeliveryThreshold)),
        });
      } catch (err: any) {
        console.error("[DeliveryChargesProvider] Error:", err);
        setError(err.message || "Failed to fetch delivery charges");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Function to update DeliveryCharges by calling the POST route
  const updateDeliveryCharges = async (newCharges: DeliveryCharges) => {
    setLoading(true);
    setError("");
    try {
      console.log("[DeliveryChargesProvider] Updating charges with:", newCharges);
      const response = await fetch("/api/deliverycharges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCharges),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to update delivery charges");
      }
      const updatedData = await response.json();
      console.log("[DeliveryChargesProvider] Response from server:", updatedData);

      setDeliveryCharges({
        ratePerMile: toTwoDecimalStr(parseFloat(updatedData.deliveryCharges.ratePerMile)),
        ratePerHour: toTwoDecimalStr(parseFloat(updatedData.deliveryCharges.ratePerHour)),
        restaurantFeePercentage: toTwoDecimalStr(parseFloat(updatedData.deliveryCharges.restaurantFeePercentage)),
        minimumCharge: toTwoDecimalStr(parseFloat(updatedData.deliveryCharges.minimumCharge)),
        freeDeliveryThreshold: toTwoDecimalStr(parseFloat(updatedData.deliveryCharges.freeDeliveryThreshold)),
      });
    } catch (err: any) {
      console.error("[DeliveryChargesProvider] Update Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DeliveryChargesContext.Provider
      value={{ deliveryCharges, updateDeliveryCharges, loading, error }}
    >
      {children}
    </DeliveryChargesContext.Provider>
  );
};

export default DeliveryChargesProvider;
