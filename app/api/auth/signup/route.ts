import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import sendEmail from "@/services/EmailService";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const {
      firstName,
      lastName,
      phone,
      email,
      streetAddress,
      aptSuite,
      city,
      state,
      zip,
      country,
      password,
    } = await request.json();

    // Validate required fields.
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { message: "First name, last name, email, and password are required." },
        { status: 400 }
      );
    }

    // Check if a user with the provided email already exists.
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "A user with that email already exists." },
        { status: 409 }
      );
    }

    // Hash the user's password.
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate a verification token with a 24-hour expiry.
    const verificationToken = uuidv4();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create the new user in the database.
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || undefined,
        streetAddress: streetAddress || undefined,
        aptSuite: aptSuite || undefined,
        city: city || undefined,
        state: state || undefined,
        zip: zip || undefined,
        country: country || undefined,
        verificationToken,
        verificationTokenExpiry,
        isVerified: false, // User must verify email before logging in.
      },
    });

    // Construct the verification link.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Compose email content.
    const subject = "Welcome to 19th Hole Restaurant and Bar - Verify Your Email";
    const text = `Hi ${firstName},\n\nThank you for signing up at 19th Hole Restaurant and Bar. Please verify your email address by clicking the link below:\n\n${verificationLink}\n\nIf you did not sign up, please ignore this email.\n\nBest regards,\n19th Hole Team`;
    const html = `<p>Hi ${firstName},</p>
                  <p>Thank you for signing up at <strong>19th Hole Restaurant and Bar</strong>. Please verify your email address by clicking the link below:</p>
                  <p><a href="${verificationLink}">Verify Your Email</a></p>
                  <p>If you did not sign up, please ignore this email.</p>
                  <p>Best regards,<br/>19th Hole Team</p>`;

    // Send the verification email.
    await sendEmail(email, subject, text, html);

    // Instead of redirecting from the API (which causes network errors in fetch),
    // return a JSON response with the redirect URL.
    return NextResponse.json(
      {
        success: true,
        message: "User created successfully. Please check your email to verify your account.",
        redirect: `${baseUrl}/verify-notice`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
