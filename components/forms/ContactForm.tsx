"use client";

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import styles from '@/components/forms/Contact.module.css';


const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' })); // Clear errors as user types
  };

  const validateForm = (): boolean => {
    const { fullName, email, phone, message } = formData;
    const newErrors: { [key: string]: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[0-9]{7,15}$/;

    if (!fullName.trim()) newErrors.fullName = 'Full Name is required.';
    if (!emailRegex.test(email)) newErrors.email = 'Invalid email address.';
    if (!phoneRegex.test(phone)) newErrors.phone = 'Invalid phone number.';
    if (!message.trim()) newErrors.message = 'Message is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedbackcenter/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error || 'Submission failed.');
      }

      toast.success('Your message has been sent successfully!');
      setFormData({ fullName: '', email: '', phone: '', message: '' });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.contactPage}>
      <h1 className={styles.contactPageTitle}>Contact Us</h1>
      <div className={styles.contactFormContainer}>
        <form className={styles.contactForm} onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className={styles.formGroup}>
            <label htmlFor="fullName">Full Name <span className={styles.required}>*</span></label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="Your Full Name"
              value={formData.fullName}
              onChange={handleChange}
              className={errors.fullName ? styles.errorInput : ''}
            />
            {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
          </div>

          {/* Email */}
          <div className={styles.formGroup}>
            <label htmlFor="email">Email <span className={styles.required}>*</span></label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? styles.errorInput : ''}
            />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
          </div>

          {/* Phone */}
          <div className={styles.formGroup}>
            <label htmlFor="phone">Phone <span className={styles.required}>*</span></label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? styles.errorInput : ''}
            />
            {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
          </div>

          {/* Message */}
          <div className={styles.formGroup}>
            <label htmlFor="message">Message <span className={styles.required}>*</span></label>
            <textarea
              id="message"
              name="message"
              placeholder="Your message..."
              value={formData.message}
              onChange={handleChange}
              rows={5}
              className={errors.message ? styles.errorInput : ''}
            ></textarea>
            {errors.message && <span className={styles.errorText}>{errors.message}</span>}
          </div>

          {/* Submit Button */}
          <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Send Message'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;
