import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    // Extract eventId from params.
    const { eventId } = await Promise.resolve(params);
    let data = await request.json();

    // Combine address fields into location if provided.
    if (data.street && data.city && data.state && data.zip) {
      data.location = `${data.street}, ${data.city}, ${data.state} ${data.zip}`;
    }
    // Remove extra address fields.
    delete data.street;
    delete data.city;
    delete data.state;
    delete data.zip;

    // Convert boolean fields.
    if (typeof data.isFree === "string") {
      data.isFree = data.isFree === "true";
    }
    if (typeof data.adultOnly === "string") {
      data.adultOnly = data.adultOnly === "true";
    }

    // Convert numeric fields safely.
    if (data.hasOwnProperty("adultPrice")) {
      const parsedAdult = parseFloat(data.adultPrice);
      data.adultPrice = isNaN(parsedAdult) ? 0 : parsedAdult;
    }
    if (data.hasOwnProperty("kidPrice")) {
      const parsedKid = parseFloat(data.kidPrice);
      data.kidPrice = isNaN(parsedKid) ? 0 : parsedKid;
    }
    if (data.hasOwnProperty("availableTickets")) {
      const parsedTickets = parseInt(data.availableTickets);
      data.availableTickets = isNaN(parsedTickets) ? 0 : parsedTickets;
    }

    // Convert date if provided.
    if (data.date) data.date = new Date(data.date);

    // Normalize image path: store only the file name if provided.
    if (data.image && typeof data.image === "string") {
      data.image = data.image.replace(/^\/?images\/|^uploads\//, "");
    } else {
      delete data.image;
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data,
    });

    return NextResponse.json({ event: updatedEvent }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating event:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = await Promise.resolve(params);
    await prisma.event.delete({
      where: { id: eventId },
    });
    return NextResponse.json({ message: "Event deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
