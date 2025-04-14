// components/SheduleOrderModal/SheduleOrderModal.tsx

"use client";

import React from "react";
import { Modal, Button } from "react-bootstrap";
import styles from "./ScheduleOrderModal.module.css";

interface ScheduleOrderModalProps {
  show: boolean;
  onHide: () => void;
  isStoreOpen: boolean;
  onASAP?: () => void;
  onSchedule: () => void;
}

export default function ScheduleOrderModal({
  show,
  onHide,
  isStoreOpen,
  onASAP,
  onSchedule,
}: ScheduleOrderModalProps) {
  return (
    <Modal show={show} onHide={onHide} centered contentClassName={styles.modalContent}>
      <Modal.Header closeButton className={styles.modalHeader}>
        <Modal.Title className={styles.modalTitle}>
          {isStoreOpen ? "Place Your Order" : "Restaurant Closed"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className={styles.modalBody}>
        {isStoreOpen ? (
          <p>
            Our restaurant is open! Would you like to start your order immediately (ASAP)
            or schedule it for a later time?
          </p>
        ) : (
          <p>
            We’re currently closed, but you can still schedule your order in advance.
            Select “Schedule Order” to choose a future time.
          </p>
        )}
      </Modal.Body>
      <Modal.Footer className={styles.modalFooter}>
        {isStoreOpen && onASAP && (
          <Button className={styles.modalButtonPrimary} onClick={onASAP}>
            Order ASAP
          </Button>
        )}
        <Button className={styles.modalButtonSecondary} onClick={onSchedule}>
          Schedule Order
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
