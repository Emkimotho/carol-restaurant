import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Default numeric floats if DB is empty:
const DEFAULT_DELIVERY_CHARGES = {
  ratePerMile: 2.0,
  ratePerHour: 20.0,
  restaurantFeePercentage: 0.1,
  minimumCharge: 8.0,
  freeDeliveryThreshold: 500.0,
};

// Convert DB float to "2.00" string
function floatToString(num: number): string {
  return num.toFixed(2);
}

// Convert string to float with fallback
function parseFloatSafe(val: any, fallback: number): number {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}

// GET: retrieve DeliveryCharges with id=1, create defaults if missing
export async function GET() {
  try {
    let record = await prisma.deliveryCharges.findUnique({ where: { id: 1 } });

    if (!record) {
      console.log("No DeliveryCharges found. Creating default record...");
      record = await prisma.deliveryCharges.create({
        data: {
          id: 1,
          ratePerMile: DEFAULT_DELIVERY_CHARGES.ratePerMile,
          ratePerHour: DEFAULT_DELIVERY_CHARGES.ratePerHour,
          restaurantFeePercentage: DEFAULT_DELIVERY_CHARGES.restaurantFeePercentage,
          minimumCharge: DEFAULT_DELIVERY_CHARGES.minimumCharge,
          freeDeliveryThreshold: DEFAULT_DELIVERY_CHARGES.freeDeliveryThreshold,
        },
      });
      console.log("Created default DeliveryCharges record:", record);
    }

    // Return them as strings so admin form sees e.g. "2.00", "10.00", etc.
    return NextResponse.json({
      ratePerMile: floatToString(record.ratePerMile),
      ratePerHour: floatToString(record.ratePerHour),
      restaurantFeePercentage: floatToString(record.restaurantFeePercentage),
      minimumCharge: floatToString(record.minimumCharge),
      freeDeliveryThreshold: floatToString(record.freeDeliveryThreshold),
    });
  } catch (error) {
    console.error("GET /api/deliverycharges error:", error);
    return NextResponse.json({ error: "Failed to fetch delivery charges." }, { status: 500 });
  }
}

// POST: upsert record with id=1, log what's incoming, parse to floats, store, return updated
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("POST /api/deliverycharges received data:", data);

    // Safely parse each field or fallback to defaults
    const ratePerMile = parseFloatSafe(data.ratePerMile, DEFAULT_DELIVERY_CHARGES.ratePerMile);
    const ratePerHour = parseFloatSafe(data.ratePerHour, DEFAULT_DELIVERY_CHARGES.ratePerHour);
    const restaurantFeePercentage = parseFloatSafe(
      data.restaurantFeePercentage,
      DEFAULT_DELIVERY_CHARGES.restaurantFeePercentage
    );
    const minimumCharge = parseFloatSafe(data.minimumCharge, DEFAULT_DELIVERY_CHARGES.minimumCharge);
    const freeDeliveryThreshold = parseFloatSafe(
      data.freeDeliveryThreshold,
      DEFAULT_DELIVERY_CHARGES.freeDeliveryThreshold
    );

    // Upsert at id=1
    const updated = await prisma.deliveryCharges.upsert({
      where: { id: 1 },
      update: {
        ratePerMile,
        ratePerHour,
        restaurantFeePercentage,
        minimumCharge,
        freeDeliveryThreshold,
      },
      create: {
        id: 1,
        ratePerMile,
        ratePerHour,
        restaurantFeePercentage,
        minimumCharge,
        freeDeliveryThreshold,
      },
    });

    console.log("Updated DeliveryCharges in DB:", updated);

    // Return updated record as strings
    return NextResponse.json({
      message: "Delivery charges updated successfully!",
      deliveryCharges: {
        ratePerMile: floatToString(updated.ratePerMile),
        ratePerHour: floatToString(updated.ratePerHour),
        restaurantFeePercentage: floatToString(updated.restaurantFeePercentage),
        minimumCharge: floatToString(updated.minimumCharge),
        freeDeliveryThreshold: floatToString(updated.freeDeliveryThreshold),
      },
    });
  } catch (error) {
    console.error("POST /api/deliverycharges error:", error);
    return NextResponse.json({ error: "Failed to update delivery charges." }, { status: 500 });
  }
}
