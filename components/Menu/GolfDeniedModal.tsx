// File: components/Menu/GolfDeniedModal.tsx
"use client";

import React from "react";
import { Modal, Button } from "react-bootstrap";

interface GolfDeniedModalProps {
  show: boolean;
  onHide: () => void;
}

export default function GolfDeniedModal({
  show,
  onHide,
}: GolfDeniedModalProps) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Access Restricted</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        On-course service is available only within the golf course boundary.
        Please enable location services or move closer to the course to use
        the Golf Menu.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
