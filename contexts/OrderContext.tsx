// File: contexts/OrderContext.tsx
"use client";

import React, {
  createContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

/* ──────────────────────────────────────────────────────────────────── */
/*  Type helpers                                                       */
/* ──────────────────────────────────────────────────────────────────── */
// Updated to match Prisma enum
export type DeliveryType =
  | "PICKUP_AT_CLUBHOUSE"
  | "ON_COURSE"
  | "EVENT_PAVILION"
  | "DELIVERY";
export type PaymentMethod = "CARD" | "CASH";

export interface DeliveryAddress {
  street: string;
  aptSuite?: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryOption?: string;
  deliveryInstructions?: string;
}

/** The full Order object stored in React state */
export interface Order {
  /* identifiers */
  id?: string;
  orderId: string | null;

  /* cart snapshot */
  items: any[];
  totalAmount: number;

  /* workflow / lifecycle */
  status: string;
  createdAt: string;
  schedule: string | null;
  orderType: string | null;

  /* golf fields */
  deliveryType: DeliveryType;
  cartId?: string | null;
  holeNumber?: number | null;
  // eventLocationId removed

  /* payment */
  paymentMethod: PaymentMethod;

  /* customer */
  customerId?: string;
  customerName?: string;

  /* guest */
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;

  /* tip */
  tip: string;
  customTip: string;

  /* financials */
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  customerDeliveryFee: number;
  restaurantDeliveryFee: number;
  totalDeliveryFee: number;
  driverPayout: number;

  /* delivery snapshot */
  deliveryStreet: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  deliveryAddress: DeliveryAddress;

  /* billing snapshot */
  billingAddress: DeliveryAddress;

  /* metrics */
  deliveryDistanceMiles: number;
  deliveryTimeMinutes: number;

  /* alcohol flags */
  containsAlcohol: boolean;
  ageVerified: boolean;
}

/* What the context provides */
export interface OrderContextType {
  order: Order;
  setOrder: React.Dispatch<React.SetStateAction<Order>>;

  /* helpers */
  setSchedule: (isoString: string, orderType?: string) => void;
  clearSchedule: () => void;
  setDeliveryAddress: (addr: DeliveryAddress) => void;
  setBillingAddress: (addr: DeliveryAddress) => void;

  setDeliveryType: (dt: DeliveryType) => void;
  setCartInfo: (cartId: string | null, hole: number | null) => void;
  // setEventLocation removed

  setPaymentMethod: (pm: PaymentMethod) => void;
  setContainsAlcohol: (flag: boolean) => void;
  setAgeVerified: (flag: boolean) => void;
}

export const OrderContext = createContext<OrderContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_ORDER_KEY = "orderState";

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const { user } = useAuth();

  /* blank template */
  const createBlankOrder = (): Order => ({
    id: undefined,
    orderId: null,
    items: [],
    totalAmount: 0,
    status: "ORDER_RECEIVED",
    createdAt: new Date().toISOString(),
    schedule: null,
    orderType: null,

    /* golf defaults */
    deliveryType: "PICKUP_AT_CLUBHOUSE",
    cartId: null,
    holeNumber: null,
    // eventLocationId omitted

    /* payment */
    paymentMethod: "CARD",

    /* customer / guest */
    customerId: user?.id.toString() ?? "",
    customerName: user?.name ?? "",
    guestName: "",
    guestEmail: "",
    guestPhone: "",

    /* tip */
    tip: "0",
    customTip: "0",

    /* financials */
    subtotal: 0,
    taxAmount: 0,
    tipAmount: 0,
    customerDeliveryFee: 0,
    restaurantDeliveryFee: 0,
    totalDeliveryFee: 0,
    driverPayout: 0,

    /* delivery snapshot */
    deliveryStreet: user?.streetAddress ?? "",
    deliveryCity: user?.city ?? "",
    deliveryState: user?.state ?? "",
    deliveryZip: user?.zip ?? "",
    deliveryAddress: {
      street: user?.streetAddress ?? "",
      aptSuite: user?.aptSuite ?? "",
      city: user?.city ?? "",
      state: user?.state ?? "",
      zipCode: user?.zip ?? "",
      deliveryOption: undefined,
      deliveryInstructions: "",
    },

    /* billing snapshot */
    billingAddress: {
      street: "",
      aptSuite: "",
      city: "",
      state: "",
      zipCode: "",
      deliveryOption: undefined,
      deliveryInstructions: "",
    },

    /* metrics */
    deliveryDistanceMiles: 0,
    deliveryTimeMinutes: 0,

    /* alcohol flags */
    containsAlcohol: false,
    ageVerified: false,
  });

  /* lazy-load from localStorage */
  const getInitialOrder = (): Order => {
    if (typeof window === "undefined") return createBlankOrder();
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ORDER_KEY);
      if (!raw) return createBlankOrder();
      const parsed = JSON.parse(raw) as Order;

      /* ensure defaults */
      parsed.schedule ??= null;
      parsed.orderType ??= null;
      parsed.deliveryType ??= "PICKUP_AT_CLUBHOUSE";
      parsed.cartId ??= null;
      parsed.holeNumber ??= null;
      parsed.paymentMethod ??= "CARD";

      parsed.containsAlcohol ??= false;
      parsed.ageVerified ??= false;

      localStorage.setItem(
        LOCAL_STORAGE_ORDER_KEY,
        JSON.stringify(parsed)
      );
      return parsed;
    } catch {
      return createBlankOrder();
    }
  };

  const [order, setOrder] = useState<Order>(getInitialOrder);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* persist */
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_ORDER_KEY,
        JSON.stringify(order)
      );
    } catch (err) {
      console.error("[OrderContext] save failed", err);
    }
  }, [order, mounted]);

  /* helpers */
  const setSchedule = (iso: string, ot?: string) =>
    setOrder((prev) => ({
      ...prev,
      schedule: iso,
      orderType: ot ?? prev.orderType,
    }));

  const clearSchedule = () =>
    setOrder((prev) => ({
      ...prev,
      schedule: null,
      orderType: null,
    }));

  const setDeliveryAddress = (addr: DeliveryAddress) =>
    setOrder((prev) => ({
      ...prev,
      deliveryAddress: addr,
      deliveryStreet: addr.street,
      deliveryCity: addr.city,
      deliveryState: addr.state,
      deliveryZip: addr.zipCode,
    }));

  const setBillingAddress = (addr: DeliveryAddress) =>
    setOrder((prev) => ({
      ...prev,
      billingAddress: addr,
    }));

  const setDeliveryType = (dt: DeliveryType) =>
    setOrder((prev) => ({ ...prev, deliveryType: dt }));

  const setCartInfo = (cartId: string | null, hole: number | null) =>
    setOrder((prev) => ({ ...prev, cartId, holeNumber: hole }));

  // setEventLocation is no longer needed

  const setPaymentMethod = (pm: PaymentMethod) =>
    setOrder((prev) => ({ ...prev, paymentMethod: pm }));

  const setContainsAlcohol = (flag: boolean) =>
    setOrder((prev) => ({ ...prev, containsAlcohol: flag }));

  const setAgeVerified = (flag: boolean) =>
    setOrder((prev) => ({ ...prev, ageVerified: flag }));

  if (!mounted) return null;

  return (
    <OrderContext.Provider
      value={{
        order,
        setOrder,
        setSchedule,
        clearSchedule,
        setDeliveryAddress,
        setBillingAddress,
        setDeliveryType,
        setCartInfo,
        setPaymentMethod,
        setContainsAlcohol,
        setAgeVerified,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};
