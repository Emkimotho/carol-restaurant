'use client';

import React, { useState } from 'react';
import styles from './contact.module.css';
import Head from 'next/head';

const Contact: React.FC = () => {
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
  });

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null); // null, true, false
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Handle individual form field changes and validate the field
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    let error = '';
    switch (name) {
      case 'fullName':
        if (!value.trim()) error = 'Full Name is required.';
        break;
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) error = 'Invalid email address.';
        break;
      }
      case 'phone': {
        const phoneRegex = /^\+?[0-9]{7,15}$/;
        if (!phoneRegex.test(value)) error = 'Invalid phone number.';
        break;
      }
      case 'message':
        if (!value.trim()) error = 'Message is required.';
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Validate entire form before submission
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      alert('Please fill out all fields correctly.');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(null);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate successful submission
      setSubmitSuccess(true);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        message: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.contactPage}>
      {/* SEO Optimization */}
      <Head>
        <title>Contact Us | The 19th Hole</title>
        <meta
          name="description"
          content="Get in touch with us at The 19th Hole Restaurant and Bar. We'd love to hear from you!"
        />
      </Head>

      <h1 className={styles.contactPageTitle}>Contact Us</h1>

      <div className={styles.contactFormContainer}>
        <form className={styles.contactForm} onSubmit={handleSubmit} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">
              Full Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="Your Full Name"
              value={formData.fullName}
              onChange={handleChange}
              required
              aria-required="true"
              aria-invalid={errors.fullName ? 'true' : 'false'}
              className={errors.fullName ? styles.errorInput : ''}
            />
            {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">
              Email Address <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              aria-required="true"
              aria-invalid={errors.email ? 'true' : 'false'}
              className={errors.email ? styles.errorInput : ''}
            />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone">
              Phone Number <span className={styles.required}>*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={handleChange}
              required
              aria-required="true"
              aria-invalid={errors.phone ? 'true' : 'false'}
              className={errors.phone ? styles.errorInput : ''}
            />
            {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="message">
              Message <span className={styles.required}>*</span>
            </label>
            <textarea
              id="message"
              name="message"
              placeholder="Your message..."
              value={formData.message}
              onChange={handleChange}
              required
              aria-required="true"
              aria-invalid={errors.message ? 'true' : 'false'}
              rows={5}
              className={errors.message ? styles.errorInput : ''}
            ></textarea>
            {errors.message && <span className={styles.errorText}>{errors.message}</span>}
          </div>

          <button type="submit" className={styles.btnPrimary} disabled={isSubmitting} aria-label="Submit Contact Form">
            {isSubmitting ? 'Submitting...' : 'Send Message'}
          </button>

          {submitSuccess === true && (
            <p className={styles.successMessage}>Your message has been sent successfully!</p>
          )}
          {submitSuccess === false && (
            <p className={styles.errorMessage}>There was an error sending your message. Please try again later.</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Contact;
