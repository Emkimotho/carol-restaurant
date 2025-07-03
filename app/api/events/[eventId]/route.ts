// File: app/api/events/[eventId]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/events/:eventId
 * Updates an existing event, including times, pricing info, image fields, and FAQs.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const contentType = request.headers.get("content-type") || "";

    // 1) Parse either application/json or multipart/form-data
    let input: any;
    if (contentType.includes("application/json")) {
      input = await request.json();
    } else {
      const formData = await request.formData();
      input = Object.fromEntries(formData.entries());
      // FAQs may arrive as stringified JSON
      if (typeof input.faqs === "string") {
        try {
          input.faqs = JSON.parse(input.faqs);
        } catch {
          return NextResponse.json(
            { message: "Invalid FAQs format" },
            { status: 400 }
          );
        }
      }
    }

    // 2) Coerce all possible inputs to strings/numbers
    const title       = input.title?.toString();
    const description = input.description?.toString();

    const street = input.street?.toString();
    const city   = input.city?.toString();
    const state  = input.state?.toString();
    const zip    = input.zip?.toString();
    const location =
      street && city && state && zip
        ? `${street}, ${city}, ${state} ${zip}`
        : undefined;

    const dateRaw      = input.date?.toString();
    const startTimeRaw = input.startTime?.toString();
    const endTimeRaw   = input.endTime?.toString();
    const fallbackTime = input.time?.toString();
    const startTime    = startTimeRaw || fallbackTime;
    const endTime      = endTimeRaw   || fallbackTime;
    const date =
      dateRaw && startTime
        ? new Date(`${dateRaw}T${startTime}`)
        : undefined;

    const adultPrice =
      input.adultPrice !== undefined
        ? parseFloat(input.adultPrice.toString())
        : undefined;
    const kidPrice =
      input.kidPrice !== undefined
        ? parseFloat(input.kidPrice.toString())
        : undefined;
    const kidPriceInfo     = input.kidPriceInfo?.toString();
    const availableTickets =
      input.availableTickets !== undefined
        ? parseInt(input.availableTickets.toString())
        : undefined;

    const isFree =
      input.isFree !== undefined
        ? input.isFree === true || input.isFree === "true"
        : undefined;
    const adultOnly =
      input.adultOnly !== undefined
        ? input.adultOnly === true || input.adultOnly === "true"
        : undefined;

    // 3) Legacy filename field
    const image = input.image?.toString();

    // 4) Cloudinary fields
    const cloudinaryPublicId = input.cloudinaryPublicId?.toString();
    const imageUrl           = input.imageUrl?.toString();

    // 5) FAQs array
    const faqsData: Array<{ question: string; answer: string }> = Array.isArray(input.faqs)
      ? input.faqs
      : [];

    // 6) Build update payload, only including fields that were provided
    const data: any = {
      ...(title        && { title }),
      ...(description  && { description }),
      ...(location     && { location }),
      ...(date         && { date }),
      ...(startTime    && { startTime }),
      ...(endTime      && { endTime }),
      ...(adultPrice   !== undefined && { adultPrice }),
      ...(kidPrice     !== undefined && { kidPrice }),
      ...(kidPriceInfo && { kidPriceInfo }),
      ...(availableTickets !== undefined && { availableTickets }),
      ...(isFree       !== undefined && { isFree }),
      ...(adultOnly    !== undefined && { adultOnly }),

      // legacy
      ...(image && { image }),

      // Cloudinary
      ...(cloudinaryPublicId && { cloudinaryPublicId }),
      ...(imageUrl           && { imageUrl }),

      // replace FAQs wholesale
      faqs: {
        deleteMany: {},
        create: faqsData.map((fq) => ({
          question: fq.question,
          answer:   fq.answer,
        })),
      },
    };

    // 7) Perform update
    const updated = await prisma.event.update({
      where: { id: eventId },
      data,
      include: { faqs: true },
    });

    return NextResponse.json({ event: updated }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating event:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/events/:eventId
 * Removes the specified event and its related FAQs.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    await prisma.event.delete({ where: { id: eventId } });
    return NextResponse.json({ message: "Event deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
