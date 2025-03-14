'use client';

import React, { useContext, useState, useEffect } from 'react';
import styles from './Checkout.module.css';
import { CartContext } from '@/contexts/CartContext';
import { AuthContext } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import GuestChoice from '@/components/checkout/GuestChoice';
import GuestDetails from '@/components/checkout/GuestDetails';
import OrderTypeStep from '@/components/checkout/OrderTypeStep';
import DeliveryAddressStep from '@/components/checkout/DeliveryAddressStep';
import OrderSummaryStep from '@/components/checkout/OrderSummaryStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import {
  validatePhoneNumber,
  formatPhoneNumber,
  calculateDeliveryFee,
} from '@/utils/checkoutUtils';

/**
 * Main Checkout component that controls the multi-step checkout flow.
 * Depending on the authentication status and order type, it renders the appropriate step.
 */
const Checkout: React.FC = () => {
  const { cartItems, getTotalPrice, clearCart } = useContext(CartContext)!;
  const { user } = useContext(AuthContext)!;
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [orderType, setOrderType] = useState<string>('');
  const [guestDetails, setGuestDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [isSameAddress, setIsSameAddress] = useState<boolean>(true);
  const [tip, setTip] = useState<string>('0');
  const [customTip, setCustomTip] = useState<string>('');
  const [isGuest, setIsGuest] = useState<boolean | null>(null);

  const taxRate = 0.07;
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Update the delivery fee when the order type changes.
  useEffect(() => {
    setDeliveryFee(orderType === 'delivery' ? calculateDeliveryFee() : 0);
  }, [orderType]);

  // Scroll to the top when the current step changes for smooth transitions.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleGuestDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGuestDetails((prev) => ({
      ...prev,
      [name]: name === 'phone' ? formatPhoneNumber(value) : value,
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
    if (value !== 'custom') {
      setCustomTip('');
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
      setBillingAddress({ street: '', city: '', state: '', zipCode: '' });
    }
  };

  const handleNextStep = () => {
    // Validate and control step navigation based on authentication and form completeness.
    if (!user && currentStep === 1 && isGuest === true) {
      const { firstName, lastName, email, phone } = guestDetails;
      if (!firstName || !lastName || !email || !phone) {
        alert('Please complete all guest details.');
        return;
      }
      if (!validatePhoneNumber(phone)) {
        alert('Please enter a valid phone number in the format (XXX) XXX-XXXX.');
        return;
      }
      setCurrentStep(2);
    } else if (!user && currentStep === 1 && isGuest === false) {
      router.push('/login');
    } else if ((currentStep === 1 && user) || (currentStep === 2 && !user)) {
      if (!orderType) {
        alert('Please select an order type.');
        return;
      }
      setCurrentStep(currentStep + 1);
    } else if (
      orderType === 'delivery' &&
      ((user && currentStep === 2) || (!user && currentStep === 3))
    ) {
      const { street, city, state, zipCode } = deliveryAddress;
      if (!street || !city || !state || !zipCode) {
        alert('Please complete your delivery address.');
        return;
      }
      setCurrentStep(currentStep + 1);
    } else if (
      (orderType === 'pickup' &&
        ((user && currentStep === 2) || (!user && currentStep === 3))) ||
      (orderType === 'delivery' &&
        ((user && currentStep === 3) || (!user && currentStep === 4)))
    ) {
      setCurrentStep(currentStep + 1);
    } else if (
      (orderType === 'pickup' &&
        ((user && currentStep === 3) || (!user && currentStep === 4))) ||
      (orderType === 'delivery' &&
        ((user && currentStep === 4) || (!user && currentStep === 5)))
    ) {
      if (orderType === 'pickup') {
        const { street, city, state, zipCode } = billingAddress;
        if (!street || !city || !state || !zipCode) {
          alert('Please complete your billing address.');
          return;
        }
      } else if (orderType === 'delivery' && !isSameAddress) {
        const { street, city, state, zipCode } = billingAddress;
        if (!street || !city || !state || !zipCode) {
          alert('Please complete your billing address.');
          return;
        }
      }
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    // Render the step based on the user's auth status and the current step.
    if (!user && currentStep === 1) {
      if (isGuest === null) {
        return <GuestChoice onSelect={(choice) => setIsGuest(choice)} />;
      } else if (isGuest === false) {
        router.push('/login');
      } else {
        return (
          <GuestDetails
            guestDetails={guestDetails}
            onChange={handleGuestDetailsChange}
            onNext={handleNextStep}
          />
        );
      }
    } else if ((user && currentStep === 1) || (!user && currentStep === 2 && isGuest)) {
      return (
        <OrderTypeStep
          orderType={orderType}
          onSelectOrderType={setOrderType}
          onNext={handleNextStep}
          onBack={handlePreviousStep}
        />
      );
    } else if (
      orderType === 'delivery' &&
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
    } else if (
      (orderType === 'pickup' &&
        ((user && currentStep === 2) || (!user && currentStep === 3))) ||
      (orderType === 'delivery' &&
        ((user && currentStep === 3) || (!user && currentStep === 4)))
    ) {
      return (
        <OrderSummaryStep
          cartItems={cartItems}
          getTotalPrice={getTotalPrice}
          orderType={orderType}
          deliveryFee={deliveryFee}
          tip={tip}
          customTip={customTip}
          onTipChange={handleTipChange}
          onCustomTipChange={handleCustomTipChange}
          taxRate={taxRate}
          onNext={handleNextStep}
          onBack={handlePreviousStep}
        />
      );
    } else if (
      (orderType === 'pickup' &&
        ((user && currentStep === 3) || (!user && currentStep === 4))) ||
      (orderType === 'delivery' &&
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
  };

  return (
    <div className={styles.checkoutContainer}>
      <div className={styles.checkoutPage}>
        <h1 className={`${styles.textCenter} mb-4`}>Checkout</h1>
        {renderStep()}
      </div>
    </div>
  );
};

export default Checkout;
