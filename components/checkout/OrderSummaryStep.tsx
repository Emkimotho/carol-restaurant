"use client";

import React from "react";
import GolfOrderSummary from "./GolfOrderSummary";
import RegularOrderSummary from "./RegularOrderSummary";
import { OrderSummaryStepProps } from "@/utils/types";

/* ------------------------------------------------------------------ */
/*  File: components/checkout/OrderSummaryStep.tsx                    */
/*                                                                    */
/*  A wrapper that delegates to either the golf-style or the           */
/*  main-menu style order summary component, based on a boolean       */
/*  flag passed via props.                                            */
/* ------------------------------------------------------------------ */

type Props = OrderSummaryStepProps & {
  /** When true, use the golf-order summary (pickup/on-course/event) */
  isGolf: boolean;
};

export default function OrderSummaryStep({ isGolf, ...rest }: Props) {
  return isGolf ? (
    <GolfOrderSummary {...(rest as OrderSummaryStepProps & { containsAlcohol: boolean })} />
  ) : (
    <RegularOrderSummary {...(rest as OrderSummaryStepProps)} />
  );
}
