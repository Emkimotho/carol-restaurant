// File: 19thhole/app/api/auth/verify-email/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { message: "Verification token is missing." },
        { status: 400 }
      );
    }

    // Find user by token.
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      // Optionally check if a user with this email is already verified.
      // If so, return success to handle duplicate requests gracefully.
      return NextResponse.json(
        { message: "Email already verified or invalid token." },
        { status: 200 }
      );
    }

    // Check token expiry.
    if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
      return NextResponse.json(
        { message: "Verification token has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Update user: mark as verified and clear token.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return NextResponse.json(
      { message: "Email verified successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { message: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
