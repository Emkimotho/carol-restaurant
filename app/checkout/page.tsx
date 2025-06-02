/* ------------------------------------------------------------------
   File: app/checkout/page.tsx
   ------------------------------------------------------------------
   Top‑level, client‑side “wizard” that walks the user through every
   step of placing an order.

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN‑MENU FLOW (menuType === "MAIN")
     1. Guest Choice  (ask if checking‑out as guest or login)
     2. Order Type    (pickup | delivery)
     3. Delivery Addr (IF delivery)
     4. Summary
     5. Payment

   GOLF / MIXED FLOW (menuType !== "MAIN")
     1. Guest Choice
     2. Golf Delivery Type (clubhouse pickup | on‑course delivery | event)
     3. Summary
     4. Payment

   Notes
   ────────────────────────────────────────────────────────────────
   • Any menuType other than "MAIN" is treated as golf‑style.
   • Golf / Mixed orders never persist `orderType` or `deliveryAddress`.
   • Step indices differ between guest / logged‑in scenarios.
   • ?step=orderSummary deep‑link supported.
-------------------------------------------------------------------*/

"use client";

import React, { useContext, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CartContext } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import type { CartItem } from "@/utils/types";

import GuestChoice            from "@/components/checkout/GuestChoice";
import GuestDetails           from "@/components/checkout/GuestDetails";
import OrderTypeStep          from "@/components/checkout/OrderTypeStep";
import DeliveryAddressStep    from "@/components/checkout/DeliveryAddressStep";
import GolfDeliveryStep       from "@/components/checkout/GolfDeliveryStep";
import OrderSummaryStep       from "@/components/checkout/OrderSummaryStep";
import PaymentStep            from "@/components/checkout/PaymentStep";

import {
  formatPhoneNumber,
  validatePhoneNumber,
} from "@/utils/checkoutUtils";

import checkoutStyles from "./CheckoutPage.module.css";

/* ───────────────── helper: Customer profile schema ────────────── */
interface Profile {
  firstName:      string;
  lastName:       string;
  email:          string;
  phone:          string | null;
  streetAddress:  string | null;
  aptSuite:       string | null;
  city:           string | null;
  state:          string | null;
  zip:            string | null;
  country:        string | null;
}

/* =================================================================
                          COMPONENT
================================================================== */
const Checkout: React.FC = () => {
  /* ────────── contexts ────────── */
  const { cartItems, getTotalPrice, menuType } = useContext(CartContext)!;
  const golfOrder = menuType !== "MAIN";          // GOLF or MIXED flow

  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ────────── wizard index ───────── */
  const [currentStep, setCurrentStep] = useState(1);

  /* MAIN‑menu: pickup | delivery */
  const [orderType, setOrderType] =
    useState<"" | "pickup" | "delivery">("");

  /* guest vs logged‑in */
  const [isGuest, setIsGuest] = useState<boolean | null>(null);
  const [guestDetails, setGuestDetails] = useState({
    firstName: "",
    lastName:  "",
    email:     "",
    phone:     "",
  });

  /* delivery address (MAIN + delivery) */
  const [deliveryAddress, setDeliveryAddress] = useState({
    street:               "",
    aptSuite:             "",
    city:                 "",
    state:                "",
    zipCode:              "",
    deliveryOption:       "",
    deliveryInstructions: "",
  });

  /* tip state */
  const [tip, setTip]           = useState("0");
  const [customTip, setCustomTip] = useState("");

  /* ───────────────── UI nicety: scroll top on step change ───────── */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  /* ───────────────── preload user address (logged‑in) ──────────── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/customer/dashboard");
        if (!res.ok) throw new Error();
        const { profile }: { profile: Profile } = await res.json();

        setDeliveryAddress({
          street:            profile.streetAddress  ?? "",
          aptSuite:          profile.aptSuite       ?? "",
          city:              profile.city           ?? "",
          state:             profile.state          ?? "",
          zipCode:           profile.zip            ?? "",
          deliveryOption:    "handToMe",
          deliveryInstructions: "",
        });
      } catch {
        /* ignore profile fetch errors */
      }
    })();
  }, [user]);

  /* ───────────────── redirect non‑logged user when choosing login ─ */
  useEffect(() => {
    if (!user && currentStep === 1 && isGuest === false) {
      router.push(`/login?redirect=${encodeURIComponent("/checkout")}`);
    }
  }, [user, isGuest, currentStep, router]);

  /* ───────────────── deep‑link ?step=orderSummary ──────────────── */
  useEffect(() => {
    if (searchParams.get("step") !== "orderSummary") return;

    if (!golfOrder && !orderType) setOrderType("pickup");

    const idx = golfOrder
      ? user ? 2 : 3
      : user
        ? orderType === "delivery" ? 3 : 2
        : orderType === "delivery" ? 4 : 3;

    setCurrentStep(idx);
  }, [searchParams, golfOrder, orderType, user]);

  /* ───────────────── input utils ─────────────── */
  const handleGuestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGuestDetails(prev => ({
      ...prev,
      [name]: name === "phone" ? formatPhoneNumber(value) : value,
    }));
  };

  const handleAddrChange =
    (setter: React.Dispatch<React.SetStateAction<typeof deliveryAddress>>) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => setter(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleTipChange = (v: string) => {
    setTip(v);
    if (v !== "custom") setCustomTip("");
  };

  /* ───────────────── wizard nav: NEXT ────────── */
  const next = () => {
    /* guest info validation */
    if (!user && currentStep === 1 && isGuest) {
      const { firstName, lastName, email, phone } = guestDetails;
      if (!firstName || !lastName || !email || !phone) {
        alert("Please complete all guest details.");
        return;
      }
      if (!validatePhoneNumber(phone)) {
        alert("Enter a valid phone number e.g. (555) 555‑5555.");
        return;
      }
      setCurrentStep(2);
      return;
    }

    /* MAIN – order type must be chosen */
    if (
      !golfOrder &&
      ((user && currentStep === 1) ||
        (!user && currentStep === 2 && isGuest))
    ) {
      if (!orderType) {
        alert("Please select an order type.");
        return;
      }
      setCurrentStep(s => s + 1);
      return;
    }

    /* MAIN – delivery addr validation */
    if (
      !golfOrder &&
      orderType === "delivery" &&
      ((user && currentStep === 2) || (!user && currentStep === 3))
    ) {
      const { street, city, state, zipCode } = deliveryAddress;
      if (!street || !city || !state || !zipCode) {
        alert("Please enter your delivery address.");
        return;
      }
      setCurrentStep(s => s + 1);
      return;
    }

    /* generic advance */
    setCurrentStep(s => s + 1);
  };

  const back = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  /* ───────────────── RENDER STEP ────────────── */
  const renderStep = () => {
    /* step 1: guest choice / guest details */
    if (!user && currentStep === 1) {
      return isGuest === null ? (
        <GuestChoice onSelect={setIsGuest} />
      ) : (
        <GuestDetails
          guestDetails={guestDetails}
          onChange={handleGuestChange}
          onNext={next}
        />
      );
    }

    /* MAIN – choose pickup / delivery */
    if (
      !golfOrder &&
      ((user && currentStep === 1) ||
        (!user && currentStep === 2 && isGuest))
    ) {
      return (
        <OrderTypeStep
          orderType={orderType}
          onSelectOrderType={setOrderType}
          onNext={next}
          onBack={back}
        />
      );
    }

    /* GOLF – select pickup / on‑course / event */
    if (
      golfOrder &&
      ((user && currentStep === 1) || (!user && currentStep === 2))
    ) {
      return <GolfDeliveryStep onNext={next} onBack={back} />;
    }

    /* MAIN – enter delivery address */
    if (
      !golfOrder &&
      orderType === "delivery" &&
      ((user && currentStep === 2) || (!user && currentStep === 3))
    ) {
      return (
        <DeliveryAddressStep
          deliveryAddress={deliveryAddress}
          onChange={handleAddrChange(setDeliveryAddress)}
          onNext={next}
          onBack={back}
        />
      );
    }

    /* Summary step */
    const atSummary = golfOrder
      ? (user && currentStep === 2) || (!user && currentStep === 3)
      : (orderType === "pickup" &&
          ((user && currentStep === 2) || (!user && currentStep === 3))) ||
        (orderType === "delivery" &&
          ((user && currentStep === 3) || (!user && currentStep === 4)));

    if (atSummary) {
      const containsAlcohol = cartItems.some(ci => ci.isAlcohol);

      return (
        <OrderSummaryStep
          cartItems={cartItems.map(ci => ({
            ...ci,
            spiceLevel: ci.spiceLevel ?? undefined,
          }))}
          getTotalPrice={getTotalPrice}
          orderType={golfOrder ? "" : orderType}
          tip={tip}
          customTip={customTip}
          onTipChange={handleTipChange}
          onCustomTipChange={e => setCustomTip(e.target.value)}
          taxRate={0.06}
          onNext={next}
          onBack={back}
          isGolf={golfOrder}
          containsAlcohol={containsAlcohol}
        />
      );
    }

    /* Payment step */
    const atPayment = golfOrder
      ? (user && currentStep === 3) || (!user && currentStep === 4)
      : (orderType === "pickup" &&
          ((user && currentStep === 3) || (!user && currentStep === 4))) ||
        (orderType === "delivery" &&
          ((user && currentStep === 4) || (!user && currentStep === 5)));

    if (atPayment) return <PaymentStep />;

    return null; // should never hit
  };

  /* ───────────────── JSX shell ─────────────── */
  return (
    <div className={checkoutStyles.checkoutContainer}>
      <div className={checkoutStyles.checkoutPage}>
        <h1 className={`${checkoutStyles.textCenter} ${checkoutStyles.mb4}`}>
          Checkout
        </h1>
        {renderStep()}
      </div>
    </div>
  );
};

export default Checkout;
