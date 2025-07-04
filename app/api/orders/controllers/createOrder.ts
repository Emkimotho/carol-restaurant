/* ========================================================================== */
/*  File: app/api/orders/controllers/createOrder.ts                           */
/* ========================================================================== */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DeliveryType,
  PaymentMethod,
  OrderStatus,
} from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

import {
  calculateTipAmount,
  calculateTaxAmount,
} from "@/utils/checkoutUtils";
import { TAX_RATE } from "@/config/taxConfig";
import { calculateDeliveryFee } from "@/utils/calculateDeliveryFee";
import { pushOrderToClover } from "@/lib/clover/orderService";

/* ────────────────────────── helpers ────────────────────────── */
const round = (n: number) => Math.round(n * 100) / 100;

function computeItemTotal(it: any): number {
  const qty = typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1;
  let price = typeof it.price === "number" ? it.price : 0;

  if (Array.isArray(it.optionGroups) && it.selectedOptions) {
    it.optionGroups.forEach((grp: any) => {
      const sel = it.selectedOptions[grp.id];
      if (!sel) return;
      grp.choices.forEach((choice: any) => {
        if (!sel.selectedChoiceIds.includes(choice.id)) return;
        price += choice.priceAdjustment ?? 0;
        if (choice.nestedOptionGroup && sel.nestedSelections?.[choice.id]) {
          sel.nestedSelections[choice.id].forEach((nid: string) => {
            const n = choice.nestedOptionGroup!.choices.find((c: any) => c.id === nid);
            if (n) price += n.priceAdjustment ?? 0;
          });
        }
      });
    });
  }

  return round(price * qty);
}

/* ========================================================================== */
export async function createOrder(req: Request) {
  try {
    /* 0️⃣  Auth */
    const session = await getServerSession(authOptions);
    if (!session?.user?.email)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    /* 1️⃣  User */
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const customerId = user.id;
    const customerName = `${user.firstName} ${user.lastName}`;

    /* 2️⃣  Body */
    const body = await req.json();
    const {
      items,
      deliveryType,
      paymentMethod: rawPaymentMethod,
      guestPhone,
    } = body;

    /* 3️⃣  Validate */
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "items required" }, { status: 400 });

    /* 4️⃣  Flags */
    const containsAlcohol = items.some((it: any) => it.isAlcohol === true);
    const isGolfOrder = deliveryType !== DeliveryType.DELIVERY;

    /* 5️⃣  Money */
    const subtotal = items.reduce(
      (s: number, it: any) => s + computeItemTotal(it),
      0
    );
    const taxAmount = calculateTaxAmount(subtotal, TAX_RATE);

    let tipAmount = Number(body.tipAmount);
    if (!Number.isFinite(tipAmount)) {
      tipAmount = calculateTipAmount(subtotal, body.tip, body.customTip);
      tipAmount = Number.isFinite(tipAmount) ? round(tipAmount) : 0;
    }

    /* 5a Delivery-fee (unchanged) */
    let customerDeliveryFee = 0;
    let restaurantDeliveryFee = 0;
    let totalDeliveryFee = 0;
    let driverPayout = 0;
    let deliveryDistanceMiles = 0;
    let deliveryTimeMinutes = 0;
    let freeDelivery = false;
    let additionalForFree = 0;
    let discountSaved: number | null = null;

    if (!isGolfOrder) {
      deliveryDistanceMiles = Number(body.deliveryDistanceMiles) || 0;
      deliveryTimeMinutes = Number(body.deliveryTimeMinutes) || 0;

      const settings = await prisma.deliveryCharges.findUnique({
        where: { id: 1 },
      });
      if (settings) {
        const fee = calculateDeliveryFee({
          distance: deliveryDistanceMiles,
          travelTimeMinutes: deliveryTimeMinutes,
          ratePerMile: settings.ratePerMile,
          ratePerHour: settings.ratePerHour,
          restaurantFeePercentage: settings.restaurantFeePercentage,
          orderSubtotal: subtotal,
          minimumCharge: settings.minimumCharge,
          freeDeliveryThreshold: settings.freeDeliveryThreshold,
        });

        customerDeliveryFee = round(fee.customerFee);
        totalDeliveryFee = round(fee.totalFee);
        restaurantDeliveryFee = round(totalDeliveryFee - customerDeliveryFee);
        driverPayout = round(totalDeliveryFee + tipAmount);
        freeDelivery = fee.freeDelivery;
        additionalForFree = fee.additionalAmountForFree;
        discountSaved = fee.discountSaved ?? null;
      }
    }

    const totalAmount = round(
      subtotal + taxAmount + tipAmount + customerDeliveryFee
    );

    /* 6️⃣  Payment-method normalisation */
    const paymentMethod: PaymentMethod =
      deliveryType === DeliveryType.DELIVERY
        ? PaymentMethod.CARD
        : rawPaymentMethod === PaymentMethod.CASH
        ? PaymentMethod.CASH
        : PaymentMethod.CARD;

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    const orderId = `ORD-${today}-${random}`;

    const initialStatus =
      paymentMethod === PaymentMethod.CASH
        ? OrderStatus.ORDER_RECEIVED
        : OrderStatus.PENDING_PAYMENT;

    /* 7️⃣  Build order */
    const data: any = {
      orderId,
      items,
      schedule: isGolfOrder
        ? null
        : body.schedule
        ? new Date(body.schedule)
        : null,
      orderType: isGolfOrder ? "" : body.orderType ?? "",
      deliveryType,
      paymentMethod,
      containsAlcohol,
      ageVerified: !!body.ageVerified,

      subtotal,
      taxAmount,
      tipAmount,
      customerDeliveryFee,
      restaurantDeliveryFee,
      totalDeliveryFee,
      driverPayout,
      freeDelivery,
      additionalAmountForFree: additionalForFree,
      discountSaved,
      deliveryDistanceMiles,
      deliveryTimeMinutes,
      totalAmount,
      status: initialStatus,
      metadata: body.metadata ?? null,

      customer: { connect: { id: customerId } },
      guestName: customerName,
      guestEmail: session.user.email,
      guestPhone: guestPhone || null,
    };

    if (isGolfOrder) {
      if (body.holeNumber != null) data.holeNumber = Number(body.holeNumber);
      const cartId = req.headers.get("x-cart-id");
      if (cartId) data.cartId = cartId;
    }

    if (deliveryType === DeliveryType.DELIVERY && body.deliveryAddress) {
      data.deliveryAddress = body.deliveryAddress;
      data.deliveryInstructions = (body.deliveryInstructions || "").trim();
    }

    /* 8️⃣  Persist order */
    const created = await prisma.order.create({ data });

    /* 9️⃣  Line-items (unchanged) */
    await Promise.all(
      items.map(async (it: any) => {
        const qty =
          typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1;
        const totalItem = computeItemTotal(it);
        const unitPrice = round(totalItem / qty);

        await prisma.orderLineItem.create({
          data: {
            order: { connect: { id: created.id } },
            menuItem: { connect: { id: it.id } },
            quantity: qty,
            unitPrice,
            spiceLevel: it.spiceLevel ?? undefined,
            specialNotes: it.specialNotes ?? undefined,
            selectedOptions: it.selectedOptions ?? undefined,
          },
        });
      })
    );

    /* 🔟  Status-history */
    await prisma.orderStatusHistory.create({
      data: {
        orderId: created.id,
        status: initialStatus,
        changedBy: session.user.name || session.user.email,
        userId: customerId,
      },
    });

    /* 1️⃣1️⃣  Clover push + force CARD on success */
    try {
      const cloverOrderId = await pushOrderToClover(created.id);
      if (cloverOrderId) {
        await prisma.order.update({
          where: { id: created.id },
          data: {
            cloverOrderId,
            cloverLastSyncAt: new Date(),
            paymentMethod: PaymentMethod.CARD,      // ← enforce CARD
            status: OrderStatus.ORDER_RECEIVED,     // ← payment confirmed
          },
        });
      }
    } catch (err: any) {
      console.error(
        `[createOrder] Clover push failed for order ${orderId}:`,
        err
      );
    }

    /* 1️⃣2️⃣  Respond */
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/orders] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
