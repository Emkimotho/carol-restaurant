// File: contexts/OrderContext.tsx
/* ======================================================================= */
/*  Global Order Context – manages the “live” Order during checkout        */
/*  and persists it to localStorage.                                       */
/*                                                                         */
/*  04 Jul 2025 PATCH 4                                                    */
/*  --------------------------------------------------------------------- */
/*  • Wipes any stored schedule that is in the past (or invalid) so every  */
/*    new session defaults to ASAP.                                        */
/*  • Everything else — post-login address sync, phone safety, helpers —   */
/*    remains unchanged.                                                   */
/* ======================================================================= */

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

  /* payment */
  paymentMethod: PaymentMethod;

  /* customer (logged-in) */
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  /* guest (anonymous) */
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

/* ──────────────────────────────────────────────────────────────────── */
/*  Context shape                                                      */
/* ──────────────────────────────────────────────────────────────────── */
export interface OrderContextType {
  order: Order;
  setOrder: React.Dispatch<React.SetStateAction<Order>>;

  setSchedule: (iso: string, orderType?: string) => void;
  clearSchedule: () => void;

  setDeliveryAddress: (addr: DeliveryAddress) => void;
  setBillingAddress:  (addr: DeliveryAddress) => void;

  setDeliveryType: (dt: DeliveryType) => void;
  setCartInfo: (cartId: string | null, hole: number | null) => void;

  setPaymentMethod: (pm: PaymentMethod) => void;
  setContainsAlcohol: (flag: boolean) => void;
  setAgeVerified: (flag: boolean) => void;
}

export const OrderContext = createContext<OrderContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_ORDER_KEY = "orderState";

/* =================================================================== */
/*  Provider                                                           */
/* =================================================================== */
interface OrderProviderProps { children: ReactNode; }

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  const { user } = useAuth(); // may be null during SSR / before session loads

  /* ---------- blank-order factory ---------- */
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

    /* payment */
    paymentMethod: "CARD",

    /* customer / guest */
    customerId:     user?.id?.toString() ?? "",
    customerName:   user?.name ?? "",
    customerEmail:  user?.email ?? "",
    customerPhone: (user as any)?.phone ?? "",
    guestName:  "",
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

    /* delivery snapshot (prefill if user already has one) */
    deliveryStreet: user?.streetAddress ?? "",
    deliveryCity:   user?.city ?? "",
    deliveryState:  user?.state ?? "",
    deliveryZip:    user?.zip ?? "",
    deliveryAddress: {
      street:   user?.streetAddress ?? "",
      aptSuite: user?.aptSuite ?? "",
      city:     user?.city ?? "",
      state:    user?.state ?? "",
      zipCode:  user?.zip ?? "",
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

  /* ---------- initial state (localStorage or blank) ---------- */
  const getInitialOrder = (): Order => {
    if (typeof window === "undefined") return createBlankOrder();
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ORDER_KEY);
      if (!raw) return createBlankOrder();

      const parsed = JSON.parse(raw) as Order;

      /* make sure required props exist or add defaults */
      parsed.schedule        ??= null;
      parsed.orderType       ??= null;
      parsed.deliveryType    ??= "PICKUP_AT_CLUBHOUSE";
      parsed.paymentMethod   ??= "CARD";
      parsed.customerEmail   ??= user?.email ?? "";
      parsed.customerPhone   ??= (user as any)?.phone ?? "";
      parsed.containsAlcohol ??= false;
      parsed.ageVerified     ??= false;

      /* ---------- NEW: wipe past-dated schedule ---------- */
      if (parsed.schedule) {
        const when = new Date(parsed.schedule);
        if (Number.isNaN(when.getTime()) || when < new Date()) {
          parsed.schedule  = null;
          parsed.orderType = null;
        }
      }

      return parsed;
    } catch {
      return createBlankOrder();
    }
  };

  const [order, setOrder] = useState<Order>(getInitialOrder);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ---------- persist to localStorage ---------- */
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_ORDER_KEY, JSON.stringify(order));
    } catch (err) {
      console.error("[OrderContext] save failed", err);
    }
  }, [order, mounted]);

  /* ---------- NEW: post-login address sync ---------- */
  useEffect(() => {
    if (!user || !user.streetAddress) return;      // nothing to sync
    if (order.deliveryStreet.trim()) return;       // already filled

    setOrder(prev => ({
      ...prev,
      deliveryStreet: user.streetAddress ?? "",
      deliveryCity:   user.city          ?? "",
      deliveryState:  user.state         ?? "",
      deliveryZip:    user.zip           ?? "",
      deliveryAddress: {
        ...prev.deliveryAddress,
        street:   user.streetAddress ?? "",
        aptSuite: user.aptSuite      ?? "",
        city:     user.city          ?? "",
        state:    user.state         ?? "",
        zipCode:  user.zip           ?? "",
      },
    }));
  }, [user, order.deliveryStreet]);

  /* ---------- helper setters ---------- */
  const setSchedule = (iso: string, ot?: string) =>
    setOrder(prev => ({ ...prev, schedule: iso, orderType: ot ?? prev.orderType }));

  const clearSchedule = () =>
    setOrder(prev => ({ ...prev, schedule: null, orderType: null }));

  const setDeliveryAddress = (addr: DeliveryAddress) =>
    setOrder(prev => ({
      ...prev,
      deliveryAddress: addr,
      deliveryStreet: addr.street,
      deliveryCity: addr.city,
      deliveryState: addr.state,
      deliveryZip: addr.zipCode,
    }));

  const setBillingAddress = (addr: DeliveryAddress) =>
    setOrder(prev => ({ ...prev, billingAddress: addr }));

  const setDeliveryType = (dt: DeliveryType) =>
    setOrder(prev => ({ ...prev, deliveryType: dt }));

  const setCartInfo = (cartId: string | null, hole: number | null) =>
    setOrder(prev => ({ ...prev, cartId, holeNumber: hole }));

  const setPaymentMethod = (pm: PaymentMethod) =>
    setOrder(prev => ({ ...prev, paymentMethod: pm }));

  const setContainsAlcohol = (flag: boolean) =>
    setOrder(prev => ({ ...prev, containsAlcohol: flag }));

  const setAgeVerified = (flag: boolean) =>
    setOrder(prev => ({ ...prev, ageVerified: flag }));

  if (!mounted) return null;

  /* ---------- provider ---------- */
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
