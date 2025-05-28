/**
 * File: app/api/orders/route.ts
 * ----------------------------------------------------------------------
 *  • GET  /api/orders
 *  • POST /api/orders  – always stores deliveryInstructions
 * -------------------------------------------------------------------- */

import { NextResponse }                    from "next/server";
import { prisma }                          from "@/lib/prisma";
import { Prisma, OrderStatus }             from "@prisma/client";
import {
  calculateTipAmount,
  calculateTaxAmount,
}                                          from "@/utils/checkoutUtils";
import { TAX_RATE }                        from "@/config/taxConfig";
import { calculateDeliveryFee }            from "@/utils/calculateDeliveryFee";

/* ------------------------------------------------------------------ */
/*  tiny util: round to 2‑dp                                           */
/* ------------------------------------------------------------------ */
const roundTwo = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/*  helper: full item price incl. option & nested adjustments          */
/* ------------------------------------------------------------------ */
function computeItemTotal(it: any): number {
  const qty   = typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1;
  let  price  = typeof it.price    === "number" ? it.price : 0;

  if (Array.isArray(it.optionGroups) && it.selectedOptions) {
    it.optionGroups.forEach((g: any) => {
      const gState = it.selectedOptions[g.id];
      if (!gState) return;

      g.choices.forEach((choice: any) => {
        if (!gState.selectedChoiceIds?.includes(choice.id)) return;

        price += choice.priceAdjustment ?? 0;

        if (choice.nestedOptionGroup) {
          const nestedSel = gState.nestedSelections?.[choice.id] ?? [];
          choice.nestedOptionGroup.choices.forEach((n: any) => {
            if (nestedSel.includes(n.id)) price += n.priceAdjustment ?? 0;
          });
        }
      });
    });
  }
  return roundTwo(price * qty);
}

/* ────────────────────────────────────────────────────────────── GET */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const role        = searchParams.get("role");
  const driverIdRaw = searchParams.get("driverId");
  const statusParam = searchParams.get("status");

  /* ─── Driver dashboard requests ─── */
  if (role === "driver" && driverIdRaw) {
    const driverId = Number(driverIdRaw);

    if (statusParam === "delivered") {
      const delivered = await prisma.order.findMany({
        where: { driverId, status: OrderStatus.DELIVERED },
        orderBy: { deliveredAt: "desc" },
      });
      return NextResponse.json(delivered);
    }

    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { status: OrderStatus.ORDER_RECEIVED, driverId: null },
          {
            driverId,
            status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  }

  /* ─── Admin / Staff search + paging ─── */
  const q     = searchParams.get("q") ?? "";
  const page  = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const skip  = (page - 1) * limit;

  let where: Prisma.OrderWhereInput = {};
  if (q) {
    where = {
      OR: [
        { orderId:    { contains: q, mode: "insensitive" } },
        { guestName:  { contains: q, mode: "insensitive" } },
        { guestEmail: { contains: q, mode: "insensitive" } },
        {
          customer: {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName:  { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ],
    };
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        customer:      { select: { firstName: true, lastName: true } },
        driver:        { select: { firstName: true, lastName: true } },
        staff:         { select: { firstName: true, lastName: true } },
        statusHistory: { orderBy: { timestamp: "asc" } },
      },
    }),
  ]);

  return NextResponse.json({
    orders,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

/* ────────────────────────────────────────────────────────────── POST */
export async function POST(req: Request) {
  try {
    /* 1. parse body */
    const {
      items,
      customerId,
      orderType,
      schedule,
      guestName,
      guestEmail,
      guestPhone,
      deliveryAddress,
      deliveryInstructions,

      /* client-side maths */
      tip,
      customTip,
      subtotal               = 0,
      taxAmount              = 0,
      tipAmount              = 0,

      /* client-side metrics */
      deliveryDistanceMiles  = 0,
      deliveryTimeMinutes    = 0,

      /* client-side total */
      totalAmount            = 0,
    } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }

    /* 2. accurate subtotal ----------------------------------------- */
    const computedSubtotal = items.reduce(
      (sum: number, it: any) => sum + computeItemTotal(it),
      0
    );
    const finalSubtotal = subtotal || computedSubtotal;

    /* ▶ fallback deliveryInstructions ------------------------------ */
    let finalInstructions: string | null = (deliveryInstructions ?? "").trim();
    if (!finalInstructions && deliveryAddress?.deliveryOption) {
      const map: Record<string, string> = {
        handToMe           : "Hand to me",
        leaveAtDoor        : "Leave at the door",
        readMyInstructions : "Read my instructions",
      };
      finalInstructions =
        map[deliveryAddress.deliveryOption] || deliveryAddress.deliveryOption;
    }
    if (!finalInstructions) finalInstructions = null;

    /* 3. tip & tax -------------------------------------------------- */
    const calcTip  = tip != null ? calculateTipAmount(finalSubtotal, tip, customTip) : 0;
    const finalTip = tipAmount || calcTip;
    const calcTax  = calculateTaxAmount(finalSubtotal, TAX_RATE);
    const finalTax = taxAmount || calcTax;

    /* 4. distance & time ------------------------------------------- */
    let finalMiles = deliveryDistanceMiles;
    let finalMins  = deliveryTimeMinutes;

    if (
      (!finalMiles || !finalMins) &&
      orderType?.includes("delivery") &&
      deliveryAddress
    ) {
      try {
        const restAddr =
          process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS ||
          "20025 Mount Aetna Road, Hagerstown, MD 21742";
        const dest =
          `${deliveryAddress.street}, ${deliveryAddress.city}, ` +
          `${deliveryAddress.state} ${deliveryAddress.zipCode}`;
        const { origin } = new URL(req.url);
        const resp = await fetch(`${origin}/api/external/distance-matrix`, {
          method : "POST",
          headers: { "Content-Type": "application/json" },
          body   : JSON.stringify({ origin: restAddr, destination: dest }),
        });
        const dm   = await resp.json();
        const elem = dm.rows?.[0]?.elements?.[0];
        if (elem?.distance?.value) finalMiles = elem.distance.value / 1609.34;
        if (elem?.duration?.value) finalMins  = Math.ceil(elem.duration.value / 60);
      } catch (e) {
        console.error("Distance‑matrix error:", e);
      }
    }

    /* 5. delivery fees --------------------------------------------- */
    const settings = await prisma.deliveryCharges.findUnique({ where: { id: 1 } });
    let totalFee = 0,
      customerFee = 0;
    if (settings) {
      const result = calculateDeliveryFee({
        distance               : finalMiles,
        travelTimeMinutes      : finalMins,
        ratePerMile            : settings.ratePerMile,
        ratePerHour            : settings.ratePerHour,
        restaurantFeePercentage: settings.restaurantFeePercentage,
        orderSubtotal          : finalSubtotal,
        minimumCharge          : settings.minimumCharge,
        freeDeliveryThreshold  : settings.freeDeliveryThreshold,
      });
      totalFee    = result.totalFee;
      customerFee = result.customerFee;
    }
    const finalCustFee = roundTwo(customerFee);
    const finalTotFee  = roundTwo(totalFee);
    const finalRestFee = settings
      ? roundTwo(settings.restaurantFeePercentage * finalSubtotal)
      : 0;

    /* 6. driver payout & grand total ------------------------------- */
    const finalDriver = roundTwo(finalTotFee + finalTip);
    const finalGrand  =
      totalAmount ||
      roundTwo(finalSubtotal + finalTax + finalTip + finalCustFee);

    /* 7. orderId ---------------------------------------------------- */
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randPart = Math.random().toString(36).slice(2, 8).toUpperCase();
    const orderId  = `ORD-${datePart}-${randPart}`;

    /* 8. payload ---------------------------------------------------- */
    const data: any = {
      orderId,
      items,
      schedule: schedule ? new Date(schedule) : null,
      orderType,
      subtotal              : finalSubtotal,
      taxAmount             : finalTax,
      tipAmount             : finalTip,
      customerDeliveryFee   : finalCustFee,
      restaurantDeliveryFee : finalRestFee,
      totalDeliveryFee      : finalTotFee,
      driverPayout          : finalDriver,
      deliveryDistanceMiles : finalMiles,
      deliveryTimeMinutes   : finalMins,
      totalAmount           : finalGrand,
      status                : OrderStatus.ORDER_RECEIVED,
      deliveryAddress       : deliveryAddress ?? undefined,
      deliveryInstructions  : finalInstructions, // always set
    };
    if (customerId) {
      data.customerId = Number(customerId);
    } else {
      data.guestName  = guestName  ?? "";
      data.guestEmail = guestEmail ?? "";
      data.guestPhone = guestPhone ?? "";
    }

    /* 9. write & history ------------------------------------------- */
    const created = await prisma.order.create({ data });

    /* changedBy for history ---------------------------------------- */
    let changedBy = "system";
    if (customerId) {
      const u = await prisma.user.findUnique({
        where : { id: Number(customerId) },
        select: { firstName: true, lastName: true },
      });
      if (u) changedBy = `${u.firstName} ${u.lastName}`.trim() || "customer";
    } else if (guestName) {
      changedBy = guestName;
    } else if (guestEmail) {
      changedBy = guestEmail;
    }

    await prisma.orderStatusHistory.create({
      data: {
        orderId : created.id,
        status  : OrderStatus.ORDER_RECEIVED,
        changedBy,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/orders] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
