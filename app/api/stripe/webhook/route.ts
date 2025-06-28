// File: app/api/stripe/webhook/route.ts
export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import Stripe from "stripe";
import { Buffer } from "buffer";
import { prisma } from "@/lib/prisma";
import { generateUniqueTicketCode } from "@/lib/ticketCodeUtils";
import sendEmail from "@/services/EmailService";
import { TicketType } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  // 1. Read raw body & Stripe signature header
  const buf = Buffer.from(await req.arrayBuffer());
  const payload = buf.toString("utf8");
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    console.error("Missing Stripe signature header");
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // 2. Verify event came from Stripe
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err: any) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 3. Only handle checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    return new Response("Ignored", { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const bookingId = session.metadata?.bookingId as string | undefined;
  if (!bookingId) {
    console.error("Missing bookingId in session metadata");
    return new Response("Missing bookingId", { status: 400 });
  }

  // 4. Fetch booking from DB
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      eventId: true,
      name: true,
      email: true,
      adultCount: true,
      kidCount: true,
      status: true, // assume string or enum
    },
  });
  if (!booking) {
    console.error("Booking not found:", bookingId);
    return new Response("Booking not found", { status: 404 });
  }

  // 5. Idempotency: if booking.status is already not PENDING_PAYMENT, or tickets exist, skip issuing again
  //    Adjust status field values according to your schema.
  const PENDING = "PENDING_PAYMENT";
  const CONFIRMED = "CONFIRMED";
  if (booking.status !== PENDING) {
    console.log(`Booking ${bookingId} status is '${booking.status}', not '${PENDING}'. Skipping ticket issuance.`);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
  // Also check if tickets already exist:
  const existingCount = await prisma.ticket.count({ where: { bookingId } });
  if (existingCount > 0) {
    console.log("Tickets already exist for booking", bookingId, "- skipping issuance.");
    // Optionally: ensure booking status is CONFIRMED
    try {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: CONFIRMED },
      });
    } catch (e) {
      console.warn("Error updating booking status to CONFIRMED in idempotent path:", e);
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  // 6. In a transaction: update booking status to CONFIRMED, then create tickets (adult then kid)
  let adultCodes: string[] = [];
  let kidCodes: string[] = [];
  try {
    await prisma.$transaction(async (tx) => {
      // Update booking status first
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: CONFIRMED },
      });

      // Then issue adult tickets
      for (let i = 0; i < booking.adultCount; i++) {
        const code = await generateUniqueTicketCode(tx);
        await tx.ticket.create({
          data: {
            bookingId:      booking.id,
            eventId:        booking.eventId,
            purchaser:      booking.name,
            purchaserEmail: booking.email,
            code,
            ticketType:     TicketType.ADULT,
          },
        });
        adultCodes.push(code);
      }
      // Then issue kid tickets
      for (let i = 0; i < booking.kidCount; i++) {
        const code = await generateUniqueTicketCode(tx);
        await tx.ticket.create({
          data: {
            bookingId:      booking.id,
            eventId:        booking.eventId,
            purchaser:      booking.name,
            purchaserEmail: booking.email,
            code,
            ticketType:     TicketType.KID,
          },
        });
        kidCodes.push(code);
      }
    });
  } catch (err: any) {
    console.error("Error in transaction creating tickets:", err);
    return new Response("Server error creating tickets", { status: 500 });
  }

  // 7. Fetch event details for email
  const eventInfo = await prisma.event.findUnique({
    where: { id: booking.eventId },
    select: {
      title:     true,
      date:      true,
      startTime: true,
      location:  true,
    },
  });

  // Prepare formatted date/time
  const when = eventInfo
    ? `${new Date(eventInfo.date).toLocaleDateString()} at ${eventInfo.startTime}`
    : "the event";

  // 8. Build and send email with grouped codes
  const allCodes = [...adultCodes, ...kidCodes];
  const subject = `Your Ticket${allCodes.length > 1 ? "s" : ""} for "${eventInfo?.title}"`;

  // Text body
  const textLines: string[] = [];
  textLines.push(`Hi ${booking.name},`);
  textLines.push("");
  textLines.push(
    `Thank you for your purchase! Here ${
      allCodes.length > 1 ? "are" : "is"
    } your ticket code${allCodes.length > 1 ? "s" : ""} for "${eventInfo?.title}" on ${when} at ${eventInfo?.location}:`
  );
  textLines.push("");

  if (adultCodes.length > 0) {
    textLines.push(`Adult Tickets (${adultCodes.length}):`);
    adultCodes.forEach((code, idx) => {
      textLines.push(`  ${idx + 1}. ${code}`);
    });
    textLines.push("");
  }
  if (kidCodes.length > 0) {
    textLines.push(`Kid Tickets (${kidCodes.length}):`);
    kidCodes.forEach((code, idx) => {
      textLines.push(`  ${idx + 1}. ${code}`);
    });
    textLines.push("");
  }

  textLines.push(
    `Please present your code${allCodes.length > 1 ? "s" : ""} at check-in.`
  );
  textLines.push("");
  textLines.push("Enjoy the event!");

  const textBody = textLines.join("\n");

  // HTML body
  const primaryColorHex = "#00bf63";
  let htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <p>Hi ${booking.name},</p>
      <p>Thank you for your purchase! Here ${
        allCodes.length > 1 ? "are" : "is"
      } your ticket code${allCodes.length > 1 ? "s" : ""} for <strong>${
    eventInfo?.title
  }</strong> on ${when} at ${eventInfo?.location}:</p>
  `;
  if (adultCodes.length > 0) {
    htmlBody += `
      <h3 style="margin-bottom: 0.5rem; color: ${primaryColorHex};">Adult Tickets (${adultCodes.length})</h3>
      <ol style="padding-left: 1.2rem; margin-bottom: 1rem;">
    `;
    adultCodes.forEach((code, idx) => {
      htmlBody += `<li style="margin-bottom: 0.5rem;">
        <strong style="font-size: 1.1em; color: ${primaryColorHex};">Ticket ${idx + 1}: ${code}</strong>
      </li>`;
    });
    htmlBody += `</ol>`;
  }
  if (kidCodes.length > 0) {
    htmlBody += `
      <h3 style="margin-bottom: 0.5rem; color: ${primaryColorHex};">Kid Tickets (${kidCodes.length})</h3>
      <ol style="padding-left: 1.2rem; margin-bottom: 1rem;">
    `;
    kidCodes.forEach((code, idx) => {
      htmlBody += `<li style="margin-bottom: 0.5rem;">
        <strong style="font-size: 1.1em; color: ${primaryColorHex};">Ticket ${idx + 1}: ${code}</strong>
      </li>`;
    });
    htmlBody += `</ol>`;
  }
  htmlBody += `
      <p>Please present your code${allCodes.length > 1 ? "s" : ""} at check-in.</p>
      <p>Enjoy the event!</p>
    </div>
  `;

  try {
    await sendEmail(booking.email, subject, textBody, htmlBody);
  } catch (err: any) {
    console.error("Error sending tickets email:", err);
    // continue anyway
  }

  // 9. Acknowledge Stripe
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
