// File: components/SlidingServices/SlidingServices.tsx
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  FaBuilding,
  FaUtensils,
  FaShippingFast,
  FaStore,
  FaSpa,
} from "react-icons/fa";
import styles from "./SlidingServices.module.css";

interface Service {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const services: Service[] = [
  {
    icon: <FaBuilding className={styles.serviceIcon} />,
    title: "Exclusive Event & Corporate Venue",
    description:
      "Host your corporate meetings, private events, or special gatherings in our serene venue, complete with a stunning lake view and premium amenities within a prestigious golf club environment.",
  },
  {
    icon: <FaUtensils className={styles.serviceIcon} />,
    title: "Event and Corporate Catering",
    description:
      "Enjoy delicious and customizable catering options tailored to suit any occasion.",
  },
  {
    icon: <FaShippingFast className={styles.serviceIcon} />,
    title: "Lunch Deliveries",
    description:
      "Experience fresh and timely lunch deliveries straight to your office or home.",
  },
  {
    icon: <FaStore className={styles.serviceIcon} />,
    title: "Dine-In or Carry Out",
    description:
      "Savor our exquisite meals in a relaxing atmosphere or opt for a convenient carry-out.",
  },
  {
    icon: <FaSpa className={styles.serviceIcon} />,
    title: "Relaxing Atmosphere",
    description:
      "Immerse yourself in a calming environment perfect for unwinding and enjoying quality time.",
  },
  {
    icon: <FaUtensils className={styles.serviceIcon} />,
    title: "Online Ordering",
    description:
      "Conveniently place your orders online with options for both pickup and delivery.",
  },
];

// Framer Motion variants for sliding animations
const slidingVariants: Variants = {
  initial: (dir: number) => ({
    x: dir > 0 ? 300 : -300,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      // Use a valid easing array instead of a string
      ease: [0.42, 0, 0.58, 1],
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -300 : 300,
    opacity: 0,
    transition: {
      duration: 0.8,
      ease: [0.42, 0, 0.58, 1],
    },
  }),
};

const SlidingServices: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  // Longer delay on the first slide
  const getDelay = () =>
    services[current].title === "Exclusive Event & Corporate Venue"
      ? 10000
      : 5000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDirection(1);
      setCurrent((idx) => (idx + 1) % services.length);
    }, getDelay());
    return () => clearTimeout(timer);
  }, [current]);

  const handlePrev = () => {
    setDirection(-1);
    setCurrent((idx) => (idx === 0 ? services.length - 1 : idx - 1));
  };

  const handleNext = () => {
    setDirection(1);
    setCurrent((idx) => (idx + 1) % services.length);
  };

  return (
    <div className={styles.slidingServices}>
      <h2>Our Services</h2>

      <div
        className={styles.sliderContainer}
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "220px",
        }}
      >
        <AnimatePresence custom={direction} initial={false}>
          <motion.div
            key={current}
            custom={direction}
            variants={slidingVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: "absolute",
              width: "100%",
              top: 0,
              left: 0,
            }}
            className={styles.serviceItem}
          >
            {services[current].icon}
            <h3>{services[current].title}</h3>
            <p>{services[current].description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.controls}>
        <button onClick={handlePrev} className={styles.controlButton}>
          Prev
        </button>
        <button onClick={handleNext} className={styles.controlButton}>
          Next
        </button>
      </div>
    </div>
  );
};

export default SlidingServices;
