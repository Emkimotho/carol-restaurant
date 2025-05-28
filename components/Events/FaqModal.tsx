// File: components/Events/FaqModal.tsx
"use client";

import React, { useState } from "react";
import styles from "./FaqModal.module.css";

interface Faq {
  question: string;
  answer: string;
}

interface FaqModalProps {
  faqs: Faq[];
  onClose: () => void;
}

export default function FaqModal({ faqs, onClose }: FaqModalProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={styles.faqModalOverlay} onClick={onClose}>
      <div className={styles.faqModal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.faqModalHeader}>
          <h2>Frequently Asked Questions</h2>
          <button className={styles.faqModalClose} onClick={onClose}>
            &times;
          </button>
        </header>
        <div className={styles.faqModalContent}>
          {faqs.map((faq, idx) => (
            <div key={idx} className={styles.faqItem}>
              <button
                className={styles.faqQuestion}
                onClick={() =>
                  setOpenIndex(openIndex === idx ? null : idx)
                }
              >
                {faq.question}
                <span className={styles.faqToggle}>
                  {openIndex === idx ? "−" : "+"}
                </span>
              </button>
              {openIndex === idx && (
                <div className={styles.faqAnswer}>{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
