// File: app/api/auth/signup/route.ts
// ──────────────────────────────────────────────────────────────
//  • Creates a new CUSTOMER account
//  • Sends e-mail verification
//  • Returns { success, redirect } JSON
// ──────────────────────────────────────────────────────────────

import { NextResponse }      from "next/server";
import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt                from "bcrypt";
import { v4 as uuidv4 }      from "uuid";
import sendEmail             from "@/services/EmailService";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // ── 1. Parse request body ────────────────────────────────────────────────
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

    // ── 2. Basic validation ──────────────────────────────────────────────────
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { message: "First name, last name, email, and password are required." },
        { status: 400 }
      );
    }

    // ── 3. Uniqueness check ──────────────────────────────────────────────────
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "A user with that email already exists." },
        { status: 409 }
      );
    }

    // ── 4. Hash password & prepare verification token ───────────────────────
    const hashedPassword          = await bcrypt.hash(password, 10);
    const verificationToken       = uuidv4();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // ── 5. Ensure CUSTOMER role exists & get its id ─────────────────────────
    const customerRole = await prisma.role.upsert({
      where:  { name: RoleName.CUSTOMER },
      update: {},
      create: { name: RoleName.CUSTOMER },
    });

    // ── 6. Create user *and* connect role in one call ────────────────────────
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone:          phone          || undefined,
        streetAddress:  streetAddress  || undefined,
        aptSuite:       aptSuite       || undefined,
        city:           city           || undefined,
        state:          state          || undefined,
        zip:            zip            || undefined,
        country:        country        || undefined,
        verificationToken,
        verificationTokenExpiry,
        isVerified: false,
        roles: {
          create: {
            role: { connect: { id: customerRole.id } },
          },
        },
      },
    });

    // ── 7. Send verification email ──────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    const subject = "Welcome to 19th Hole – Verify Your Email";
    const text    = `Hi ${firstName},

Thank you for signing up at 19th Hole Restaurant and Bar.
Please verify your email address by clicking the link below:

${verificationLink}

If you did not sign up, please ignore this e-mail.

Best regards,
19th Hole Team`;

    const html = `<p>Hi ${firstName},</p>
<p>Thank you for signing up at <strong>19th Hole Restaurant and Bar</strong>.</p>
<p>Please verify your email address by clicking the link below:</p>
<p><a href="${verificationLink}">${verificationLink}</a></p>
<p>If you did not sign up, please ignore this e-mail.</p>
<p>Best regards,<br/>19th Hole Team</p>`;

    await sendEmail(email, subject, text, html);

    // ── 8. Respond (client will redirect) ────────────────────────────────────
    return NextResponse.json(
      {
        success:  true,
        message:  "User created successfully. Please check your e-mail.",
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
