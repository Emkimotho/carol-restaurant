// File: app/api/events/[eventId]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PUT /api/events/:eventId
 * Updates an existing event, including times, pricing info, image, and FAQs.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const contentType = request.headers.get("content-type") || "";

    let input: any;
    if (contentType.includes("application/json")) {
      input = await request.json();
    } else {
      const formData = await request.formData();
      input = Object.fromEntries(formData.entries());
      if (typeof input.faqs === "string") {
        try {
          input.faqs = JSON.parse(input.faqs);
        } catch {
          return NextResponse.json({ message: "Invalid FAQs format" }, { status: 400 });
        }
      }
    }

    // — Basic text fields —
    const title       = input.title?.toString();
    const description = input.description?.toString();

    // — Address → location —
    const street = input.street?.toString();
    const city   = input.city?.toString();
    const state  = input.state?.toString();
    const zip    = input.zip?.toString();
    const location =
      street && city && state && zip
        ? `${street}, ${city}, ${state} ${zip}`
        : undefined;

    // — Date & Times —
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

    // — Pricing & Tickets —
    const adultPrice       =
      input.adultPrice !== undefined
        ? parseFloat(input.adultPrice.toString())
        : undefined;
    const kidPrice         =
      input.kidPrice !== undefined
        ? parseFloat(input.kidPrice.toString())
        : undefined;
    const kidPriceInfo     = input.kidPriceInfo?.toString();
    const availableTickets =
      input.availableTickets !== undefined
        ? parseInt(input.availableTickets.toString())
        : undefined;

    // — Flags —
    const isFree =
      input.isFree !== undefined
        ? input.isFree === true || input.isFree === "true"
        : undefined;
    const adultOnly =
      input.adultOnly !== undefined
        ? input.adultOnly === true || input.adultOnly === "true"
        : undefined;

    // — Image upload (filename only) —
    let image: string | undefined;
    if (input.image) {
      image = input.image.toString();
    }

    // — FAQs array (already parsed) —
    const faqsData: { question: string; answer: string }[] = Array.isArray(input.faqs)
      ? input.faqs
      : [];

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        // only include a field if we parsed a value
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
        ...(image        && { image }),
        ...(isFree       !== undefined && { isFree }),
        ...(adultOnly    !== undefined && { adultOnly }),
        // replace FAQs wholesale
        faqs: {
          deleteMany: {},
          create: faqsData.map((fq) => ({
            question: fq.question,
            answer:   fq.answer,
          })),
        },
      },
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
