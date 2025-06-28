import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sendEmail from "@/services/EmailService";

interface RsvpData {
  name: string;
  email: string;
  adultCount: number;
  kidCount: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const body = (await request.json()) as RsvpData;

    // Basic validation & trimming
    if (
      !eventId ||
      typeof body.name !== "string" ||
      body.name.trim() === "" ||
      typeof body.email !== "string" ||
      body.email.trim() === "" ||
      typeof body.adultCount !== "number" ||
      body.adultCount < 0 ||
      typeof body.kidCount !== "number" ||
      body.kidCount < 0 ||
      body.adultCount + body.kidCount <= 0
    ) {
      return NextResponse.json(
        { message: "Missing or invalid RSVP fields" },
        { status: 400 }
      );
    }
    const name = body.name.trim();
    const email = body.email.trim();
    const adultCount = body.adultCount;
    const kidCount = body.kidCount;
    const totalCount = adultCount + kidCount;

    // Fetch event to ensure it exists, is free, and check availableTickets if needed
    const eventRecord = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        location: true,
        isFree: true,
        availableTickets: true,
      },
    });
    if (!eventRecord) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }
    if (!eventRecord.isFree) {
      return NextResponse.json(
        { message: "This event requires payment; RSVP not allowed." },
        { status: 400 }
      );
    }
    // If enforcing ticket limits:
    if (typeof eventRecord.availableTickets === "number") {
      if (eventRecord.availableTickets < totalCount) {
        return NextResponse.json(
          { message: "Not enough tickets available for RSVP." },
          { status: 400 }
        );
      }
    }

    // Transaction: create RSVP and decrement availableTickets only (no ticket records)
    const createdRsvp = await prisma.$transaction(async (tx) => {
      // Decrement availableTickets if tracked
      if (typeof eventRecord.availableTickets === "number") {
        await tx.event.update({
          where: { id: eventId },
          data: { availableTickets: eventRecord.availableTickets - totalCount },
        });
      }
      // Create RSVP (Prisma client uses rSVP for model RSVP)
      const newRsvp = await tx.rSVP.create({
        data: {
          eventId,
          name,
          email,
          adultCount,
          kidCount,
        },
      });
      return newRsvp;
    });

    // Build and send a thankful email (no codes)
    const { title, date, startTime, location } = eventRecord;
    const eventDateStr = `${new Date(date).toLocaleDateString()} at ${startTime}`;

    const subject = `Thank you for RSVPing for "${title}"`;
    // Text body
    const textLines: string[] = [];
    textLines.push(`Hello ${name},`);
    textLines.push("");
    textLines.push(
      `Thank you for RSVPing for "${title}" on ${eventDateStr} at ${location}.`
    );
    textLines.push(
      `We have reserved ${adultCount} adult ticket${adultCount !== 1 ? "s" : ""}`
      + (kidCount > 0
          ? ` and ${kidCount} kid ticket${kidCount !== 1 ? "s" : ""}.`
          : ".")
    );
    textLines.push("");
    textLines.push("No ticket codes are needed for free events.");
    textLines.push("");
    textLines.push("We look forward to seeing you there!");
    const textBody = textLines.join("\n");

    // HTML body
    const primaryColorHex = "#00bf63"; // or adjust as desired
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <p>Hello ${name},</p>
        <p>Thank you for RSVPing for "<strong>${title}</strong>" on ${eventDateStr} at ${location}.</p>
        <p style="margin-top: 1rem;">
          We have reserved <strong>${adultCount}</strong> adult ticket${adultCount !== 1 ? "s" : ""}
          ${kidCount > 0
            ? `and <strong>${kidCount}</strong> kid ticket${kidCount !== 1 ? "s" : ""}.`
            : "."}
        </p>
        <p style="margin-top: 1rem;">
          No ticket codes are needed for free events.
        </p>
        <p style="margin-top: 1rem;">
          We look forward to seeing you there!
        </p>
      </div>
    `;

    try {
      await sendEmail(email, subject, textBody, htmlBody);
    } catch (err: any) {
      console.error("Error sending RSVP email:", err);
      // continue without failing the RSVP
    }

    // Respond with RSVP info and reserved counts
    return NextResponse.json(
      {
        rsvp: createdRsvp,
        reserved: {
          adultCount,
          kidCount,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating RSVP:", error);
    return NextResponse.json(
      { message: "Server error: " + (error.message ?? String(error)) },
      { status: 500 }
    );
  }
}
