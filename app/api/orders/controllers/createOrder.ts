// File: app/api/orders/controllers/createOrder.ts
// ------------------------------------------------------------------
// • POST /api/orders
//   – MAIN flow (deliveryType === "DELIVERY") keeps full math
//   – GOLF flow  (deliveryType !== "DELIVERY") keeps ONLY
//        subtotal, taxAmount, tipAmount, totalAmount
//        and zeroes every other money/distance field
//   – schedule is forced to null for golf
//   – containsAlcohol derived server-side
//   – changedBy = customer’s name or guestName if present
//   – cash payments skip PENDING_PAYMENT and start at ORDER_RECEIVED
// ------------------------------------------------------------------

import { NextResponse }               from "next/server";
import { prisma }                     from "@/lib/prisma";
import {
  OrderStatus,
  DeliveryType,
  PaymentMethod,
}                                      from "@prisma/client";
import {
  calculateTipAmount,
  calculateTaxAmount,
}                                      from "@/utils/checkoutUtils";
import { TAX_RATE }                   from "@/config/taxConfig";
import { calculateDeliveryFee }       from "@/utils/calculateDeliveryFee";

const round = (n: number) => Math.round(n * 100) / 100;

// helper: compute item total including selected options
function computeItemTotal(it: any): number {
  const qty = typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1;
  let price = typeof it.price === "number" ? it.price : 0;

  if (Array.isArray(it.optionGroups) && it.selectedOptions) {
    it.optionGroups.forEach((g: any) => {
      const sel = it.selectedOptions[g.id];
      if (!sel) return;
      g.choices.forEach((c: any) => {
        if (!sel.selectedChoiceIds?.includes(c.id)) return;
        price += c.priceAdjustment ?? 0;
        if (c.nestedOptionGroup && sel.nestedSelections?.[c.id]) {
          sel.nestedSelections[c.id].forEach((nid: string) => {
            const nc = c.nestedOptionGroup!.choices.find((n: any) => n.id === nid);
            if (nc) price += nc.priceAdjustment ?? 0;
          });
        }
      });
    });
  }

  return round(price * qty);
}

export async function createOrder(req: Request) {
  try {
    const body = await req.json();
    const { items, deliveryType, paymentMethod } = body;

    // 1. require items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }

    // 2. flags
    const containsAlcohol = items.some((it: any) => it.isAlcohol === true);
    const isGolfOrder     = deliveryType !== DeliveryType.DELIVERY;

    // 3. compute subtotal
    const subtotal = body.subtotal ?? items.reduce(
      (sum: number, it: any) => sum + computeItemTotal(it),
      0
    );

    // 4. compute tax
    const computedTax = calculateTaxAmount(subtotal, TAX_RATE);
    const taxAmount   = isGolfOrder
      ? computedTax
      : (body.taxAmount ?? computedTax);

    // 5. compute tip
    const computedTip = body.tip != null
      ? calculateTipAmount(subtotal, body.tip, body.customTip)
      : 0;
    const tipAmount = body.tipAmount ?? computedTip;

    // 6. delivery fees & metrics (only MAIN)
    let customerDeliveryFee   = 0;
    let restaurantDeliveryFee = 0;
    let totalDeliveryFee      = 0;
    let driverPayout          = 0;
    let deliveryDistanceMiles = 0;
    let deliveryTimeMinutes   = 0;

    if (!isGolfOrder) {
      deliveryDistanceMiles = body.deliveryDistanceMiles ?? 0;
      deliveryTimeMinutes   = body.deliveryTimeMinutes   ?? 0;

      const settings = await prisma.deliveryCharges.findUnique({ where: { id: 1 } });
      if (settings) {
        const fee = calculateDeliveryFee({
          distance:               deliveryDistanceMiles,
          travelTimeMinutes:      deliveryTimeMinutes,
          ratePerMile:            settings.ratePerMile,
          ratePerHour:            settings.ratePerHour,
          restaurantFeePercentage: settings.restaurantFeePercentage,
          orderSubtotal:          subtotal,
          minimumCharge:          settings.minimumCharge,
          freeDeliveryThreshold:  settings.freeDeliveryThreshold,
        });
        customerDeliveryFee   = round(fee.customerFee);
        totalDeliveryFee      = round(fee.totalFee);
        restaurantDeliveryFee = round(settings.restaurantFeePercentage * subtotal);
        driverPayout          = round(totalDeliveryFee + tipAmount);
      }
    }

    // 7. grand total
    const totalAmount = body.totalAmount ?? round(
      subtotal + taxAmount + tipAmount + customerDeliveryFee
    );

    // 8. generate orderId
    const datePart = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const randPart = Math.random().toString(36).slice(2,8).toUpperCase();
    const orderId  = `ORD-${datePart}-${randPart}`;

    // 9. pick initial status: cash → ORDER_RECEIVED, else PENDING_PAYMENT
    const initialStatus =
      paymentMethod === PaymentMethod.CASH
        ? OrderStatus.ORDER_RECEIVED
        : OrderStatus.PENDING_PAYMENT;

    // 10. build payload
    const data: any = {
      orderId,
      items,
      schedule:               isGolfOrder ? null : (body.schedule ? new Date(body.schedule) : null),
      orderType:              isGolfOrder ? "" : (body.orderType ?? ""),
      deliveryType,
      paymentMethod,
      containsAlcohol,
      ageVerified:            Boolean(body.ageVerified),

      subtotal,
      taxAmount,
      tipAmount,
      customerDeliveryFee,
      restaurantDeliveryFee,
      totalDeliveryFee,
      driverPayout,

      deliveryDistanceMiles,
      deliveryTimeMinutes,
      totalAmount,

      status: initialStatus,
    };

    // 11. golf extras
    if (isGolfOrder) {
      if (body.holeNumber != null) data.holeNumber = Number(body.holeNumber);
      const cartId = req.headers.get("x-cart-id");
      if (cartId) data.cartId = cartId;
    }
    // 12. main delivery extras
    else if (deliveryType === DeliveryType.DELIVERY && body.deliveryAddress) {
      data.deliveryAddress = body.deliveryAddress;
      if (body.deliveryInstructions) {
        data.deliveryInstructions = body.deliveryInstructions.trim();
      }
    }

    // 13. customer vs guest
    if (body.customerId) {
      data.customerId = Number(body.customerId);
    } else {
      data.guestName  = body.guestName  || "";
      data.guestEmail = body.guestEmail || "";
      data.guestPhone = body.guestPhone || "";
    }

    // 14. persist order
    const created = await prisma.order.create({ data });

    // 15. determine changedBy label
    let changedBy = "system";
    if (body.customerId) {
      const u = await prisma.user.findUnique({
        where:  { id: Number(body.customerId) },
        select: { firstName: true, lastName: true },
      });
      if (u) changedBy = `${u.firstName} ${u.lastName}`.trim() || "customer";
    } else if (body.guestName)  {
      changedBy = body.guestName;
    } else if (body.guestEmail) {
      changedBy = body.guestEmail;
    }

    // 16. record initial status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId:   created.id,
        status:    initialStatus,
        changedBy,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/orders] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
