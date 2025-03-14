'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './Catering.module.css';

export default function CateringPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    venue: '',  // New Venue Field
    guests: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Handle Input Change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Validate Form Fields
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required.';
    if (!formData.email.trim()) newErrors.email = 'Email is required.';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required.';
    if (!formData.date.trim()) newErrors.date = 'Event date is required.';
    if (!formData.time.trim()) newErrors.time = 'Event time is required.';
    if (!formData.venue.trim()) newErrors.venue = 'Venue/Address is required.'; // Venue validation
    if (!formData.guests.trim() || Number(formData.guests) <= 0) 
      newErrors.guests = 'Please enter a valid number of guests.';
    
    return newErrors;
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setSubmitSuccess(true);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      date: '',
      time: '',
      venue: '',
      guests: '',
      message: '',
    });
    setErrors({});
    setIsSubmitting(false);
  };

  return (
    <section className={styles.cateringSection}>
      <div className={styles.cateringContainer}>
        {/* Left Pane: Image */}
        <div className={styles.leftPane}>
          <Image
            src="/assets/img/catering-img.jpg"
            alt="Catering"
            width={600}
            height={800}
            className={styles.image}
          />
        </div>

        {/* Right Pane: Form */}
        <div className={styles.rightPane}>
          <div className={styles.formWrapper}>
            <h2 className={styles.formHeading}>Request Catering</h2>
            
            {submitSuccess && (
              <div className={styles.alertSuccess}>
                🎉 Your catering request has been successfully submitted!
              </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
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
                {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
              </div>

              {/* Email & Phone */}
              <div className={styles.formRow}>
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
                  {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="phone">Phone *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                  />
                  {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                </div>
              </div>

              {/* Date & Time */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="date">Event Date *</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                  />
                  {errors.date && <span className={styles.errorText}>{errors.date}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="time">Event Time *</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                  />
                  {errors.time && <span className={styles.errorText}>{errors.time}</span>}
                </div>
              </div>

              {/* Venue/Address */}
              <div className={styles.formGroup}>
                <label htmlFor="venue">Venue / Address *</label>
                <input
                  type="text"
                  id="venue"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  placeholder="Enter venue or event address"
                />
                {errors.venue && <span className={styles.errorText}>{errors.venue}</span>}
              </div>

              {/* Guests */}
              <div className={styles.formGroup}>
                <label htmlFor="guests">Number of Guests *</label>
                <input
                  type="number"
                  id="guests"
                  name="guests"
                  value={formData.guests}
                  onChange={handleChange}
                  placeholder="Enter number of guests"
                  min="1"
                />
                {errors.guests && <span className={styles.errorText}>{errors.guests}</span>}
              </div>

              {/* Additional Information */}
              <div className={styles.formGroup}>
                <label htmlFor="message">Additional Information</label>
                <textarea
                  id="message"
                  name="message"
                  rows={3}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Any additional requests or details"
                ></textarea>
              </div>

              {/* Submit Button */}
              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
