"use client";

import { useState } from 'react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import styles from '@/components/forms/Reseration.module.css';


interface FormData {
  fullName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: string;
  message: string;
}

export default function ReservationForm() {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    guests: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submissionStatus, setSubmissionStatus] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): Partial<FormData> => {
    const newErrors: Partial<FormData> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) newErrors.email = 'Invalid email format';
    }
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.phone)) newErrors.phone = 'Phone must be 10 digits';
    }
    if (!formData.date) newErrors.date = 'Reservation date is required';
    if (!formData.time) newErrors.time = 'Reservation time is required';
    if (!formData.guests) {
      newErrors.guests = 'Number of guests is required';
    } else {
      const guestsNumber = Number(formData.guests);
      if (guestsNumber < 1 || guestsNumber > 20) {
        newErrors.guests = 'Number of guests must be between 1 and 20';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmissionStatus('');
      return;
    }

    setSubmissionStatus('submitting');
    try {
      const response = await fetch('/api/feedbackcenter/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          guests: Number(formData.guests),
        }),
      });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Submission failed');
      }

      toast.success('Your reservation has been submitted!');
      setSubmissionStatus('success');
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        guests: '',
        message: '',
      });
      setErrors({});
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      setSubmissionStatus('error');
    }
  };

  return (
    <section className={styles.reservationSection}>
      <div className={styles.container}>
        <div className={styles.reservationContainer}>
          {/* Left Column */}
          <div className={styles.leftPane}>
            <Image
              src="/assets/img/reserve-image.jpg"
              alt="Reservation"
              width={700}
              height={475}
              className={styles.image}
            />
          </div>

          {/* Right Column */}
          <div className={styles.rightPane}>
            <div className={styles.formWrapper}>
              <h2 className={styles.formHeading}>Book a Table</h2>
              {submissionStatus === 'success' && (
                <div className={styles.alertSuccess}>
                  Your reservation has been submitted successfully!
                </div>
              )}
              <form onSubmit={handleSubmit} noValidate className={styles.form}>
                {/* Full Name */}
                <div className={styles.formGroup}>
                  <label htmlFor="fullName">Full Name *</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && <span className={styles.invalidFeedback}>{errors.fullName}</span>}
                </div>

                {/* Email */}
                <div className={styles.formGroup}>
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                  />
                  {errors.email && <span className={styles.invalidFeedback}>{errors.email}</span>}
                </div>

                {/* Phone */}
                <div className={styles.formGroup}>
                  <label htmlFor="phone">Phone *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    pattern="[0-9]{10}"
                    title="Phone number must be 10 digits"
                  />
                  {errors.phone && <span className={styles.invalidFeedback}>{errors.phone}</span>}
                </div>

                {/* Date & Time */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="date">Date *</label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                    />
                    {errors.date && <span className={styles.invalidFeedback}>{errors.date}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="time">Time *</label>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                    />
                    {errors.time && <span className={styles.invalidFeedback}>{errors.time}</span>}
                  </div>
                </div>

                {/* Guests */}
                <div className={styles.formGroup}>
                  <label htmlFor="guests">Guests *</label>
                  <input
                    type="number"
                    id="guests"
                    name="guests"
                    value={formData.guests}
                    onChange={handleChange}
                    placeholder="Number of guests"
                    min="1"
                    max="20"
                  />
                  {errors.guests && <span className={styles.invalidFeedback}>{errors.guests}</span>}
                </div>

                {/* Message */}
                <div className={styles.formGroup}>
                  <label htmlFor="message">Message (Optional)</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={3}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Any special requests?"
                  />
                </div>

                <button type="submit" className={styles.submitBtn}>
                  {submissionStatus === 'submitting' ? 'Submitting...' : 'Reserve Now'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
