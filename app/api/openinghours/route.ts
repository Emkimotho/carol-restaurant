// File: app/api/openinghours/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hours = await prisma.openingHour.findMany({
      orderBy: { id: "asc" },
    });
    // Convert the array into an object keyed by day
    const hoursDict = hours.reduce((acc, item) => {
      acc[item.day] = { open: item.open, close: item.close };
      return acc;
    }, {} as { [day: string]: { open: string; close: string } });
    return NextResponse.json(hoursDict);
  } catch (error) {
    console.error("Error fetching opening hours:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // data should be an object with days as keys and { open, close } as values
    const days = Object.keys(data);
    for (const day of days) {
      const { open, close } = data[day];
      await prisma.openingHour.upsert({
        where: { day },
        update: { open, close },
        create: { day, open, close },
      });
    }
    return NextResponse.json({ message: "Opening hours updated successfully" });
  } catch (error) {
    console.error("Error updating opening hours:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
