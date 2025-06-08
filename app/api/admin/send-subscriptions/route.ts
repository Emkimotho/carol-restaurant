// File: app/api/admin/send-subscriptions/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sendEmail from "@/services/EmailService";

export async function POST(request: Request) {
  try {
    const { subject, bodyHtml } = (await request.json()) as {
      subject?: string;
      bodyHtml?: string;
    };

    if (!subject || !bodyHtml) {
      return NextResponse.json(
        { error: "Subject and bodyHtml are required." },
        { status: 400 }
      );
    }

    // Fetch all subscriber emails
    const subs = await prisma.subscription.findMany({
      select: { email: true },
    });
    if (subs.length === 0) {
      return NextResponse.json(
        { error: "No subscribers to send to." },
        { status: 400 }
      );
    }

    // Build a comma-separated list for Gmail BCC
    const emailList = subs.map((s) => s.email).join(",");

    // Use your existing EmailService
    // sendEmail(to: string, subject: string, text: string, html: string)
    await sendEmail(emailList, subject, "", bodyHtml);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in send-subscriptions:", err);
    return NextResponse.json(
      { error: "Failed to send emails." },
      { status: 500 }
    );
  }
}
