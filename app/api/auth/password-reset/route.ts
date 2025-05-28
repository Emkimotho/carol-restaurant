// File: app/api/auth/password-reset/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcrypt";
import sendEmail from "@/services/EmailService";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json(
        { message: "Email is required." },
        { status: 400 }
      );
    }

    // Look up user (don’t reveal if it exists or not)
    const user = await prisma.user.findUnique({ where: { email } });
    const responseMessage =
      "If this email exists, a password reset link has been sent.";

    if (!user) {
      return NextResponse.json({ message: responseMessage }, { status: 200 });
    }

    // 1) Generate a secure plain‑text token
    const resetTokenPlain = crypto.randomBytes(32).toString("hex");
    // 2) Hash that token before storing
    const resetTokenHash = await bcrypt.hash(resetTokenPlain, 10);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // 3) Save hash + expiry on the user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      },
    });

    // 4) Build the reset link with the plain token
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetTokenPlain}&email=${encodeURIComponent(
      email
    )}`;

    // 5) Send the email
    const subject = "Password Reset Request";
    const text = `
You requested a password reset. Click or paste the link below (valid 1 hour):

${resetLink}

If you did not request this, you can safely ignore this email.
`;
    const html = `
      <p>You requested a password reset. Please click the link below to set your new password (valid for one hour):</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    await sendEmail(email, subject, text, html);
    console.log(`Password reset for ${email} — plain token: ${resetTokenPlain}`);

    return NextResponse.json({ message: responseMessage }, { status: 200 });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
