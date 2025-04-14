"use client";

import React, { useContext, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CartContext } from "@/contexts/CartContext";
import { AuthContext } from "@/contexts/AuthContext";
import GuestChoice from "@/components/checkout/GuestChoice";
import GuestDetails from "@/components/checkout/GuestDetails";
import OrderTypeStep from "@/components/checkout/OrderTypeStep";
import DeliveryAddressStep from "@/components/checkout/DeliveryAddressStep";
import OrderSummaryStep from "@/components/checkout/OrderSummaryStep";
import PaymentStep from "@/components/checkout/PaymentStep";
import { validatePhoneNumber, formatPhoneNumber } from "@/utils/checkoutUtils";
import checkoutStyles from "./CheckoutPage.module.css";

const Checkout: React.FC = () => {
  const { cartItems, getTotalPrice } = useContext(CartContext)!;
  const { user } = useContext(AuthContext)!;
  const router = useRouter();
  const searchParams = useSearchParams();

  // currentStep drives our multi-step flow.
  // (Default value is 1.)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [orderType, setOrderType] = useState<string>(""); // e.g., "pickup" or "delivery"
  const [guestDetails, setGuestDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [billingAddress, setBillingAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [isSameAddress, setIsSameAddress] = useState<boolean>(true);
  const [tip, setTip] = useState<string>("0");
  const [customTip, setCustomTip] = useState<string>("");
  const [isGuest, setIsGuest] = useState<boolean | null>(null);

  const taxRate = 0.07;
  // Fallback delivery fee; real logic is applied in summary step.
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Debug log current step.
  useEffect(() => {
    console.log("[Checkout] currentStep =", currentStep);
  }, [currentStep]);

  // Adjust fallback delivery fee based on order type.
  useEffect(() => {
    if (orderType === "delivery") {
      console.log("[Checkout] User selected delivery. Setting fallback fee = 0");
      setDeliveryFee(0);
    } else {
      setDeliveryFee(0);
    }
  }, [orderType]);

  // Scroll to top on step change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // ---
  // EFFECT: Check if there is a forced step from the query parameter.
  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam === "orderSummary") {
      // If no order type was set (user returning from scheduling) then default to "pickup"
      if (!orderType) {
        console.log("[Checkout] No orderType detected, defaulting to 'pickup' for resume.");
        setOrderType("pickup");
      }
      let summaryStep: number;
      if (user) {
        summaryStep = orderType === "delivery" ? 3 : 2;
      } else {
        summaryStep = orderType === "delivery" ? 4 : 3;
      }
      console.log("[Checkout] Forcing order summary step:", summaryStep);
      setCurrentStep(summaryStep);
    }
  }, [searchParams, orderType, user]);

  // --- Field change handlers
  const handleGuestDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGuestDetails((prev) => ({
      ...prev,
      [name]: name === "phone" ? formatPhoneNumber(value) : value,
    }));
  };

  const handleDeliveryAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeliveryAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleBillingAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBillingAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleTipChange = (value: string) => {
    setTip(value);
    if (value !== "custom") {
      setCustomTip("");
    }
  };

  const handleCustomTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTip(e.target.value);
  };

  const handleSameAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsSameAddress(checked);
    if (checked) {
      setBillingAddress(deliveryAddress);
    } else {
      setBillingAddress({ street: "", city: "", state: "", zipCode: "" });
    }
  };

  // --- Navigation Handlers
  const handleNextStep = () => {
    console.log("[Checkout] handleNextStep at currentStep:", currentStep);

    // --- Guest flow: Step 1 if not logged in.
    if (!user && currentStep === 1 && isGuest === true) {
      const { firstName, lastName, email, phone } = guestDetails;
      if (!firstName || !lastName || !email || !phone) {
        alert("Please complete all guest details.");
        return;
      }
      if (!validatePhoneNumber(phone)) {
        alert("Please enter a valid phone number in (XXX) XXX-XXXX format.");
        return;
      }
      setCurrentStep(2);
      return;
    } else if (!user && currentStep === 1 && isGuest === false) {
      router.push("/login");
      return;
    }

    // --- Order type step (logged in: step 1; guest: step 2).
    if ((user && currentStep === 1) || (!user && currentStep === 2 && isGuest)) {
      if (!orderType) {
        alert("Please select an order type.");
        return;
      }
      console.log("[Checkout] next -> selected orderType =", orderType);
      setCurrentStep(currentStep + 1);
      return;
    }

    // --- Delivery address step (only required if orderType === "delivery").
    if (
      orderType === "delivery" &&
      ((user && currentStep === 2) || (!user && currentStep === 3))
    ) {
      const { street, city, state, zipCode } = deliveryAddress;
      if (!street || !city || !state || !zipCode) {
        alert("Please complete your delivery address.");
        return;
      }
      setCurrentStep(currentStep + 1);
      return;
    }

    // --- Order summary step.
    if (
      (orderType === "pickup" &&
        ((user && currentStep === 2) || (!user && currentStep === 3))) ||
      (orderType === "delivery" &&
        ((user && currentStep === 3) || (!user && currentStep === 4)))
    ) {
      setCurrentStep(currentStep + 1);
      return;
    }

    // --- Payment step: ensure billing address if needed.
    if (
      (orderType === "pickup" &&
        ((user && currentStep === 3) || (!user && currentStep === 4))) ||
      (orderType === "delivery" &&
        ((user && currentStep === 4) || (!user && currentStep === 5)))
    ) {
      if (orderType === "pickup") {
        const { street, city, state, zipCode } = billingAddress;
        if (!street || !city || !state || !zipCode) {
          alert("Please complete your billing address.");
          return;
        }
      } else if (orderType === "delivery" && !isSameAddress) {
        const { street, city, state, zipCode } = billingAddress;
        if (!street || !city || !state || !zipCode) {
          alert("Please complete your billing address.");
          return;
        }
      }
      setCurrentStep(currentStep + 1);
      return;
    }

    // --- Otherwise, simply advance to next step.
    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // --- Render Step Function
  const renderStep = () => {
    // --- Guest-related step(s).
    if (!user && currentStep === 1) {
      if (isGuest === null) {
        return <GuestChoice onSelect={(choice) => setIsGuest(choice)} />;
      } else if (isGuest === false) {
        router.push("/login");
        return null;
      } else {
        return (
          <GuestDetails
            guestDetails={guestDetails}
            onChange={handleGuestDetailsChange}
            onNext={handleNextStep}
          />
        );
      }
    }
    // --- Order type selection.
    if ((user && currentStep === 1) || (!user && currentStep === 2 && isGuest)) {
      return (
        <OrderTypeStep
          orderType={orderType}
          onSelectOrderType={setOrderType}
          onNext={handleNextStep}
          onBack={handlePreviousStep}
        />
      );
    }
    // --- Delivery address step.
    if (
      orderType === "delivery" &&
      ((user && currentStep === 2) || (!user && currentStep === 3))
    ) {
      return (
        <DeliveryAddressStep
          deliveryAddress={deliveryAddress}
          onChange={handleDeliveryAddressChange}
          onNext={handleNextStep}
          onBack={handlePreviousStep}
        />
      );
    }
    // --- Order summary step.
    if (
      (orderType === "pickup" &&
        ((user && currentStep === 2) || (!user && currentStep === 3))) ||
      (orderType === "delivery" &&
        ((user && currentStep === 3) || (!user && currentStep === 4)))
    ) {
      return (
        <OrderSummaryStep
          cartItems={cartItems}
          getTotalPrice={getTotalPrice}
          orderType={orderType}
          deliveryFee={deliveryFee} // fallback fee; dynamic logic is in OrderSummaryStep
          tip={tip}
          customTip={customTip}
          onTipChange={handleTipChange}
          onCustomTipChange={handleCustomTipChange}
          taxRate={taxRate}
          onNext={handleNextStep}
          onBack={handlePreviousStep}
        />
      );
    }
    // --- Payment step.
    if (
      (orderType === "pickup" &&
        ((user && currentStep === 3) || (!user && currentStep === 4))) ||
      (orderType === "delivery" &&
        ((user && currentStep === 4) || (!user && currentStep === 5)))
    ) {
      return (
        <PaymentStep
          orderType={orderType}
          isSameAddress={isSameAddress}
          billingAddress={billingAddress}
          deliveryAddress={deliveryAddress}
          onBillingAddressChange={handleBillingAddressChange}
          onSameAddressChange={handleSameAddressChange}
          onNext={handleNextStep}
          onBack={handlePreviousStep}
        />
      );
    }
    return null;
  };

  return (
    <div className={checkoutStyles.checkoutContainer}>
      <div className={checkoutStyles.checkoutPage}>
        <h1 className={`${checkoutStyles.textCenter} ${checkoutStyles.mb4}`}>Checkout</h1>
        {renderStep()}
      </div>
    </div>
  );
};

export default Checkout;
