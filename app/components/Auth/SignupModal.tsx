"use client";

import React, { useState } from "react";
import styles from "./SignupModal.module.css";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendURL: string;
}

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, backendURL }) => {
  const [step, setStep] = useState(1);

  // Step 1: Personal Info
  const [signUpFirstName, setSignUpFirstName] = useState("");
  const [signUpLastName, setSignUpLastName] = useState("");
  const [signUpPhone, setSignUpPhone] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");

  // Step 2: Address & Security
  const [signUpStreetAddress, setSignUpStreetAddress] = useState("");
  const [signUpAptSuite, setSignUpAptSuite] = useState("");
  const [signUpCity, setSignUpCity] = useState("");
  const [signUpState, setSignUpState] = useState("MD");
  const [signUpZip, setSignUpZip] = useState("");
  const [signUpCountry, setSignUpCountry] = useState("US");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState("");

  const [signUpError, setSignUpError] = useState("");
  const [signUpMessage, setSignUpMessage] = useState("");

  const stateOptions = [
    { value: "MD", label: "Maryland" },
    { value: "PA", label: "Pennsylvania" },
    { value: "VA", label: "Virginia" },
    { value: "WV", label: "West Virginia" },
  ];

  const countryOptions = [
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
  ];

  // Phone number formatting: auto-format as (XXX) XXX-XXXX.
  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) return "";
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignUpPhone(formatPhoneNumber(e.target.value));
  };

  // Validate phone as 10-digit number.
  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10;
  };

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => password.length >= 6;
  const validateZip = (zip: string) =>
    /^\d{5}(-\d{4})?$/.test(zip);

  const resetForm = () => {
    setSignUpFirstName("");
    setSignUpLastName("");
    setSignUpPhone("");
    setSignUpEmail("");
    setSignUpStreetAddress("");
    setSignUpAptSuite("");
    setSignUpCity("");
    setSignUpState("MD");
    setSignUpZip("");
    setSignUpCountry("US");
    setSignUpPassword("");
    setSignUpConfirmPassword("");
    setSignUpError("");
    setSignUpMessage("");
    setStep(1);
  };

  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignUpError("");
    // Validate Step 1 fields.
    if (
      signUpFirstName.trim() === "" ||
      signUpLastName.trim() === "" ||
      !validatePhone(signUpPhone) ||
      !validateEmail(signUpEmail)
    ) {
      setSignUpError("Please fill in all fields correctly in Step 1.");
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setSignUpError("");
    setStep(1);
  };

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignUpError("");
    setSignUpMessage("");
    // Validate Step 2 fields.
    if (
      signUpStreetAddress.trim() === "" ||
      signUpCity.trim() === "" ||
      signUpState.trim() === "" ||
      !validateZip(signUpZip) ||
      signUpCountry.trim() === "" ||
      !validatePassword(signUpPassword) ||
      signUpPassword !== signUpConfirmPassword
    ) {
      setSignUpError("Please fill in all fields correctly in Step 2.");
      return;
    }

    // Remove phone formatting for submission.
    const rawPhone = signUpPhone.replace(/\D/g, "");

    const payload = {
      firstName: signUpFirstName,
      lastName: signUpLastName,
      phone: rawPhone,
      email: signUpEmail,
      streetAddress: signUpStreetAddress,
      aptSuite: signUpAptSuite,
      city: signUpCity,
      state: signUpState,
      zip: signUpZip,
      country: signUpCountry,
      password: signUpPassword,
    };

    try {
      // Using a relative URL: API endpoint is available at /api/auth/signup.
      const response = await fetch(`/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok && data.success && data.redirect) {
        // Instead of just closing the modal, redirect to the notice page.
        window.location.assign(data.redirect);
      } else {
        setSignUpError(data.message || "Sign-up failed. Please try again.");
      }
    } catch (error) {
      console.error("Sign-up error:", error);
      setSignUpError("Network error. Please try again later.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles["modal-overlay"]} aria-modal="true">
      <div className={styles["modal-content"]}>
        <button
          className={styles["close-button"]}
          onClick={() => {
            resetForm();
            onClose();
          }}
          aria-label="Close Sign Up Modal"
        >
          &times;
        </button>
        <h3>Sign Up</h3>
        {signUpError && <p className={styles["error-message"]}>{signUpError}</p>}
        {signUpMessage && (
          <p className={styles["success-message"]}>{signUpMessage}</p>
        )}
        {step === 1 && (
          <form onSubmit={handleNext}>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-first-name">First Name</label>
              <input
                type="text"
                id="signup-first-name"
                placeholder="First Name"
                value={signUpFirstName}
                onChange={(e) => setSignUpFirstName(e.target.value)}
                required
              />
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-last-name">Last Name</label>
              <input
                type="text"
                id="signup-last-name"
                placeholder="Last Name"
                value={signUpLastName}
                onChange={(e) => setSignUpLastName(e.target.value)}
                required
              />
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-phone">Phone Number</label>
              <input
                type="tel"
                id="signup-phone"
                placeholder="(123) 456-7890"
                value={signUpPhone}
                onChange={handlePhoneChange}
                required
              />
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-email">Email Address</label>
              <input
                type="email"
                id="signup-email"
                placeholder="Enter your email"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles["form-actions"]}>
              <button type="submit" className={styles["btn-primary"]}>
                Next
              </button>
            </div>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleSignupSubmit}>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-street-address">Street Address</label>
              <input
                type="text"
                id="signup-street-address"
                placeholder="123 Main St"
                value={signUpStreetAddress}
                onChange={(e) => setSignUpStreetAddress(e.target.value)}
                required
              />
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-apt-suite">Apt/Suite</label>
              <input
                type="text"
                id="signup-apt-suite"
                placeholder="Apt, Suite, etc."
                value={signUpAptSuite}
                onChange={(e) => setSignUpAptSuite(e.target.value)}
              />
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-city">City</label>
              <input
                type="text"
                id="signup-city"
                placeholder="City"
                value={signUpCity}
                onChange={(e) => setSignUpCity(e.target.value)}
                required
              />
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-state">State/Province</label>
              <select
                id="signup-state"
                value={signUpState}
                onChange={(e) => setSignUpState(e.target.value)}
                required
              >
                {stateOptions.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-zip">Zip/Postal Code</label>
              <input
                type="text"
                id="signup-zip"
                placeholder="Zip/Postal Code"
                value={signUpZip}
                onChange={(e) => setSignUpZip(e.target.value)}
                required
              />
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-country">Country</label>
              <select
                id="signup-country"
                value={signUpCountry}
                onChange={(e) => setSignUpCountry(e.target.value)}
                required
              >
                {countryOptions.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-password">Password</label>
              <input
                type="password"
                id="signup-password"
                placeholder="Enter your password"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                required
              />
            </div>
            <div className={styles["form-group"]}>
              <label htmlFor="signup-confirm-password">Confirm Password</label>
              <input
                type="password"
                id="signup-confirm-password"
                placeholder="Confirm your password"
                value={signUpConfirmPassword}
                onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className={styles["form-actions"]}>
              <button
                type="button"
                className={styles["btn-primary"]}
                onClick={handleBack}
              >
                Back
              </button>
              <button type="submit" className={styles["btn-primary"]}>
                Sign Up
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SignupModal;
