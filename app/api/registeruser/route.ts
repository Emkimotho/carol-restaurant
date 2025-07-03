// File: app/api/registeruser/route.ts
// ────────────────────────────────────────────────────────────────────
//  • Accepts application/json (client pre-uploads photo to Cloudinary)
//  • Inserts user + profiles in Prisma
//  • Generates one-time reset-link (no temp password)
//  • Sends link via central EmailService
// ────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { PrismaClient, RoleName } from "@prisma/client";
import * as bcrypt from "bcrypt";
import sendEmail from "@/services/EmailService";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // 1. parse JSON
    const {
      firstName,
      lastName,
      email,
      phone,
      roles,
      position,
      licenseNumber,
      carMakeModel,
      photoUrl
    } = (await request.json()) as {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      roles: string[];
      position?: string;
      licenseNumber?: string;
      carMakeModel?: string;
      photoUrl?: string;
    };

    // 2. validate required fields
    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
      !Array.isArray(roles) ||
      roles.length === 0
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 3. normalize & validate roles
    const validRoles = roles
      .map((r) => r.toUpperCase())
      .filter((r) => Object.values(RoleName).includes(r as RoleName)) as RoleName[];

    if (validRoles.length !== roles.length) {
      return NextResponse.json(
        { message: "Invalid roles provided" },
        { status: 400 }
      );
    }

    // 4. create placeholder password + hash
    const placeholder = randomUUID();
    const hashedPwd = await bcrypt.hash(placeholder, 10);

    // 5. create one-time reset token + hash + expiry
    const resetPlain = randomUUID();
    const resetHash = await bcrypt.hash(resetPlain, 10);
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // 6. create user
    const user = await prisma.user.create({
      data: {
        email: email.trim(),
        password: hashedPwd,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || null,
        isVerified: true,
        resetToken: resetHash,
        resetTokenExpiry: resetExpiry,
        roles: {
          create: validRoles.map((roleName) => ({
            role: { connect: { name: roleName } },
          })),
        },
      },
    });

    // 7. upsert StaffProfile ANY time there’s a photoUrl
    if (photoUrl) {
      await prisma.staffProfile.upsert({
        where: { userId: user.id },
        update: {
          photoUrl,
          photoPublicId: null,        // we’re only passing URL here
          position: position?.trim() || "",
        },
        create: {
          userId: user.id,
          photoUrl,
          photoPublicId: null,
          position: position?.trim() || "",
        },
      });
    }

    // 8. upsert DriverProfile if DRIVER role assigned
    if (validRoles.includes(RoleName.DRIVER)) {
      await prisma.driverProfile.upsert({
        where: { userId: user.id },
        update: {
          photoUrl: photoUrl || null,
          photoPublicId: null,
          licenseNumber: licenseNumber?.trim() || "",
          carMakeModel: carMakeModel?.trim() || "",
        },
        create: {
          userId: user.id,
          photoUrl: photoUrl || null,
          photoPublicId: null,
          licenseNumber: licenseNumber?.trim() || "",
          carMakeModel: carMakeModel?.trim() || "",
        },
      });
    }

    // 9. send reset-password email
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetPlain}&email=${encodeURIComponent(
      email
    )}`;
    const subject = "Welcome to 19th-Hole – Set Your Password";
    const text = `Hi ${firstName},\n\nAn administrator created an account for you.\nPlease click the link below to choose your password (valid for one hour):\n${resetLink}\n\nRegards,\n19th-Hole Team`;
    const html = `<p>Hi ${firstName},</p>
<p>An administrator created an account for you.</p>
<p>Please click <a href="${resetLink}">here</a> to choose your password (valid for one hour).</p>
<p>Regards,<br/>19th-Hole Team</p>`;

    await sendEmail(email, subject, text, html);

    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (err: any) {
    console.error("RegisterUser error:", err);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
