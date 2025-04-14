"use client";

import React, { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { OrderContext } from "@/contexts/OrderContext";
import { useOpeningHours } from "@/contexts/OpeningHoursContext";
import styles from "./MenuTimingBar.module.css";

const MenuTimingBar: React.FC = () => {
  const router = useRouter();
  const { order, clearSchedule } = useContext(OrderContext)!;
  const { isOpen } = useOpeningHours();
  const { schedule } = order;
  const [showPopup, setShowPopup] = useState(false);

  // Returns the current timing status.
  const getTimingStatus = () => {
    if (schedule) {
      const dateObj = new Date(schedule);
      return `Scheduled for ${dateObj.toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    return "Instant Order (ASAP)";
  };

  // When the user clicks the change button, clear any schedule and show the popup.
  const handleChangeClick = () => {
    clearSchedule();
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  // If user chooses ASAP:
  const chooseASAP = () => {
    closePopup();
    if (!isOpen) {
      router.push("/schedule-order");
      return;
    }
    // For ASAP, no schedule is needed.
  };

  // If user chooses Schedule:
  const chooseSchedule = () => {
    closePopup();
    router.push("/schedule-order");
  };

  return (
    <>
      <div className={styles.timingBar}>
        <span className={styles.timingStatus}>
          Your current order timing is: {getTimingStatus()}
        </span>
        <button className={styles.changeBtn} onClick={handleChangeClick}>
          Change Order Timing
        </button>
      </div>

      {showPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupModal}>
            <div className={styles.popupHeader}>
              <h3 className={styles.popupTitle}>Change Order Timing</h3>
            </div>
            <div className={styles.popupBody}>
              <p>
                You can place your order instantly (ASAP) or schedule it for later.
                Pickup/delivery type will be chosen in checkout.
              </p>
              {!isOpen && (
                <p className={styles.closedMessage}>
                  We are currently closed. You can only schedule your order for a future time.
                </p>
              )}
            </div>
            <div className={styles.popupFooter}>
              {isOpen && (
                <button className={styles.popupBtnPrimary} onClick={chooseASAP}>
                  ASAP Order
                </button>
              )}
              <button className={styles.popupBtnSecondary} onClick={chooseSchedule}>
                Schedule Order
              </button>
            </div>
            <button className={styles.popupClose} onClick={closePopup}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MenuTimingBar;
