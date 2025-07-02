// File: app/api/registeruser/route.ts
// ────────────────────────────────────────────────────────────────────
//  • Accepts multipart/form-data
//  • Uploads photo to Cloudinary under “profiles” folder
//  • Inserts user + profiles in Prisma
//  • Generates one-time reset-link (no temp password)
//  • Sends link via central EmailService
// ────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { PrismaClient, RoleName } from "@prisma/client";
import * as bcrypt from "bcrypt";
import sendEmail from "@/services/EmailService";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

// configure Cloudinary from your .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = { api: { bodyParser: false } };

export async function POST(req: Request) {
  try {
    // 1. parse form
    const form           = await req.formData();
    const roles          = form.getAll("roles").map(r => String(r).toUpperCase()) as RoleName[];
    const firstName      = String(form.get("firstName") || "").trim();
    const lastName       = String(form.get("lastName")  || "").trim();
    const email          = String(form.get("email")     || "").trim();
    const phone          = String(form.get("phone")     || "").trim();
    const position       = form.get("position")        ? String(form.get("position")).trim()    : null;
    const licenseNumber  = form.get("licenseNumber")   ? String(form.get("licenseNumber")).trim() : null;
    const carMakeModel   = form.get("carMakeModel")    ? String(form.get("carMakeModel")).trim()  : null;
    const fileField      = form.get("photo")           as Blob | null;

    // 2. validate basics
    if (!firstName || !lastName || !email || roles.length === 0) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }
    // ensure roles are valid
    const validRoles = roles.filter(r => Object.values(RoleName).includes(r as any));
    if (validRoles.length !== roles.length) {
      return NextResponse.json({ message: "Invalid roles provided" }, { status: 400 });
    }

    // 3. upload photo to Cloudinary (optional)
    let photoUrl: string | null = null;
    let photoPublicId: string | null = null;
    if (fileField && fileField.size) {
      const arrayBuffer = await fileField.arrayBuffer();
      const b64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUri = `data:${fileField.type};base64,${b64}`;
      const upload = await cloudinary.uploader.upload(dataUri, {
        folder: "profiles",
        public_id: randomUUID(),
        overwrite: true,
      });
      photoPublicId = upload.public_id;
      photoUrl       = upload.secure_url;
    }

    // 4. create dummy password + hash
    const placeholder       = randomUUID();
    const hashedPlaceholder = await bcrypt.hash(placeholder, 10);

    // 5. create one-time reset token
    const resetPlain  = randomUUID();
    const resetHash   = await bcrypt.hash(resetPlain, 10);
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // 6. create user
    const user = await prisma.user.create({
      data: {
        email,
        password:       hashedPlaceholder,
        firstName,
        lastName,
        phone,
        isVerified:     true,
        resetToken:     resetHash,
        resetTokenExpiry: resetExpiry,
        roles: {
          create: validRoles.map(roleName => ({
            role: { connect: { name: roleName } }
          })),
        },
      },
    });

    // 7. upsert staff profile if needed
    if (validRoles.includes("STAFF")) {
      await prisma.staffProfile.upsert({
        where:  { userId: user.id },
        update: {
          photoUrl:       photoUrl   || "",
          photoPublicId:  photoPublicId || "",
          position:       position   || "",
        },
        create: {
          userId:         user.id,
          photoUrl:       photoUrl   || "",
          photoPublicId:  photoPublicId || "",
          position:       position   || "",
        },
      });
    }

    // 8. upsert driver profile if needed
    if (validRoles.includes("DRIVER")) {
      await prisma.driverProfile.upsert({
        where:  { userId: user.id },
        update: {
          photoUrl,
          photoPublicId,
          licenseNumber: licenseNumber || "",
          carMakeModel:  carMakeModel  || "",
        },
        create: {
          userId:        user.id,
          photoUrl,
          photoPublicId,
          licenseNumber: licenseNumber || "",
          carMakeModel:  carMakeModel  || "",
        },
      });
    }

    // 9. build and send reset email
    const baseUrl   = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetPlain}&email=${encodeURIComponent(email)}`;
    const subject   = "Welcome to 19th-Hole – Set Your Password";
    const text      = `Hi ${firstName},\n\nAn administrator created an account for you.\nPlease click the link below to choose your password (valid for one hour):\n${resetLink}\n\nRegards,\n19th-Hole Team`;
    const html      = `<p>Hi ${firstName},</p>
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
