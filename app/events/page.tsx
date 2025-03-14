"use client"; // Needed if using Next.js 13 App Router in a client component

import React, { useState } from "react";
import Image from "next/image";
import styles from "./events.module.css";

// Example event image inside /public/images (adjust path/filename if needed)
const tasteAfricaImage = "/images/taste-africa.jpg";

const Events: React.FC = () => {
  // Mock data for demonstration (replace with real backend data)
  const [event] = useState({
    title: "African Networking",
    description:
      "A delightful event showcasing African food, music, and culture.",
    image: tasteAfricaImage,
    location: "123 Event Street, City, Country",
    date: "2024-12-01",
    time: "6:00 PM",
    prices: {
      adults: 50,
      kids: 20,
    },
    availableTickets: 100, // Total number of tickets available
  });

  // Booking state: start at zero for both adults and kids
  const [booking, setBooking] = useState({
    adults: 0,
    kids: 0,
  });

  // State for total price and remaining tickets
  const [totalPrice, setTotalPrice] = useState(0);
  const [ticketsLeft, setTicketsLeft] = useState(event.availableTickets);

  // Handle input changes for booking fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBooking((prev) => ({
      ...prev,
      [name]: parseInt(value) || 0, // default to 0 if input is cleared
    }));
  };

  // Recalculate the total price
  const calculateTotal = () => {
    const newTotal =
      booking.adults * event.prices.adults + booking.kids * event.prices.kids;
    setTotalPrice(newTotal);
  };

  // Booking confirmation and validation
  const handleBook = () => {
    const totalTickets = booking.adults + booking.kids;

    // Check if no participants
    if (totalTickets === 0) {
      alert("Add at least one participant.");
      return;
    }

    // Check if enough tickets are left
    if (totalTickets > ticketsLeft) {
      alert("Not enough tickets available!");
      return;
    }

    // Payment logic (e.g., Clover) would go here

    // Update available tickets after successful booking
    setTicketsLeft((prev) => prev - totalTickets);
    alert(`Booking confirmed! Total price: $${totalPrice}`);
  };

  return (
    <section className={styles["events-section"]}>
      <div className="container">
        <div className={styles["event-card"]}>
          {/* Event Image */}
          <div className={styles["event-image-wrapper"]}>
            <Image
              src={event.image}
              alt={event.title}
              width={400}
              height={300}
              className={styles["event-image"]}
            />
          </div>

          {/* Event Details */}
          <div className={styles["event-details"]}>
            <h2>{event.title}</h2>
            <p>{event.description}</p>
            <p>
              <strong>Location:</strong> {event.location}
            </p>
            <p>
              <strong>Date &amp; Time:</strong> {event.date} at {event.time}
            </p>
            <p>
              <strong>Available Tickets:</strong> {ticketsLeft}
            </p>
            <div className={styles["ticket-prices"]}>
              <p>
                <strong>Adults:</strong> ${event.prices.adults} each
              </p>
              <p>
                <strong>Kids:</strong> ${event.prices.kids} each
              </p>
            </div>
          </div>

          {/* Booking Form */}
          <div className={styles["booking-form"]}>
            <h3>Book Your Tickets</h3>
            <div className={styles["form-group"]}>
              <label htmlFor="adults">Adults</label>
              <input
                type="number"
                id="adults"
                name="adults"
                min={0}
                value={booking.adults}
                onChange={handleChange}
                onBlur={calculateTotal}
              />
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="kids">Kids</label>
              <input
                type="number"
                id="kids"
                name="kids"
                min={0}
                value={booking.kids}
                onChange={handleChange}
                onBlur={calculateTotal}
              />
            </div>

            {/* Total Price */}
            <div className={styles["total-price"]}>
              <strong>Total Price: ${totalPrice}</strong>
            </div>

            {/* Book Now Button */}
            <button className="btn btn-primary" onClick={handleBook}>
              Book Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Events;
