// File: 19thhole/app/api/auth/password-reset/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import sendEmail from "../../../../services/emailService";

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

    // Check if the user exists.
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // For security, always return the same response.
    const responseMessage =
      "If this email exists, a password reset link has been sent.";

    if (!user) {
      return NextResponse.json({ message: responseMessage });
    }

    // Generate a reset token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Update the user with the reset token and an expiry (1 hour).
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry: new Date(Date.now() + 3600000),
      },
    });

    // Construct the reset URL using your base URL.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    // Compose email details.
    const subject = "Password Reset Request";
    const text = `You requested a password reset. Please use the following link to reset your password: ${resetLink}\n\nIf you did not request this, please ignore this email.`;
    const html = `<p>You requested a password reset. Please click the link below to reset your password:</p>
                  <p><a href="${resetLink}">Reset Password</a></p>
                  <p>If you did not request this, please ignore this email.</p>`;

    // Send the email using the centralized email service.
    await sendEmail(email, subject, text, html);

    console.log(`Password reset token for ${email}: ${resetToken}`);

    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
