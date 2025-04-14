"use client";

import React, { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { toast } from "react-toastify";
// or remove the 'toast' calls if you prefer your own approach.

interface DeliveryChargesData {
  ratePerMile: string;
  ratePerHour: string;
  restaurantFeePercentage: string;
  minimumCharge: string;
  freeDeliveryThreshold: string;
}

const AdminDeliveryCharges: React.FC = () => {
  const [formData, setFormData] = useState<DeliveryChargesData>({
    ratePerMile: "",
    ratePerHour: "",
    restaurantFeePercentage: "",
    minimumCharge: "",
    freeDeliveryThreshold: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1) On mount, fetch /api/deliverycharges (like opening hours)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/deliverycharges");
        if (!res.ok) {
          throw new Error(`Failed to fetch. Status: ${res.status}`);
        }
        const data = await res.json();
        // data: { ratePerMile: "2.00", ratePerHour: "10.00", ... }
        setFormData(data);
      } catch (err: any) {
        console.error("Error fetching delivery charges:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 2) Update local form state on user input
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // 3) Submit -> POST data to the route
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/deliverycharges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        throw new Error(`Failed to update. Status: ${res.status}`);
      }
      const result = await res.json(); // e.g. { message, deliveryCharges }
      console.log("Updated result from server:", result);
      // Optional: show a toast or custom message
      toast.success("Delivery charges updated successfully!");
      // Re-sync the form with the server result
      setFormData(result.deliveryCharges);
    } catch (err: any) {
      console.error("Error updating delivery charges:", err);
      setError(err.message || "Error updating delivery charges");
      toast.error("Error updating delivery charges");
    }
  };

  if (loading) return <div>Loading delivery charges...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  return (
    <div className="admin-delivery-charges">
      <h2>Manage Delivery Charges</h2>
      <form onSubmit={handleSubmit}>
        {/* Rate per Mile */}
        <div>
          <label htmlFor="ratePerMile">Rate per Mile ($):</label>
          <select
            id="ratePerMile"
            name="ratePerMile"
            value={formData.ratePerMile}
            onChange={handleChange}
            required
          >
            <option value="">Select Rate per Mile</option>
            <option value="1.00">$1.00</option>
            <option value="1.50">$1.50</option>
            <option value="2.00">$2.00</option>
            <option value="2.50">$2.50</option>
            <option value="3.00">$3.00</option>
          </select>
        </div>

        {/* Rate per Hour */}
        <div>
          <label htmlFor="ratePerHour">Rate per Hour ($):</label>
          <select
            id="ratePerHour"
            name="ratePerHour"
            value={formData.ratePerHour}
            onChange={handleChange}
            required
          >
            <option value="">Select Rate per Hour</option>
            <option value="10.00">$10.00</option>
            <option value="15.00">$15.00</option>
            <option value="20.00">$20.00</option>
            <option value="25.00">$25.00</option>
            <option value="30.00">$30.00</option>
          </select>
        </div>

        {/* Restaurant Fee Percentage */}
        <div>
          <label htmlFor="restaurantFeePercentage">Restaurant Fee Percentage (%):</label>
          <input
            type="number"
            id="restaurantFeePercentage"
            name="restaurantFeePercentage"
            min="0"
            max="1"
            step="0.1"
            value={formData.restaurantFeePercentage}
            onChange={handleChange}
            required
          />
        </div>

        {/* Minimum Charge */}
        <div>
          <label htmlFor="minimumCharge">Minimum Charge ($):</label>
          <input
            type="number"
            id="minimumCharge"
            name="minimumCharge"
            min="0"
            step="0.01"
            value={formData.minimumCharge}
            onChange={handleChange}
            required
          />
        </div>

        {/* Free Delivery Threshold */}
        <div>
          <label htmlFor="freeDeliveryThreshold">Free Delivery Threshold ($):</label>
          <input
            type="number"
            id="freeDeliveryThreshold"
            name="freeDeliveryThreshold"
            min="0"
            step="0.01"
            value={formData.freeDeliveryThreshold}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">Save Changes</button>
      </form>
    </div>
  );
};

export default AdminDeliveryCharges;
