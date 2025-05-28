// File: app/api/registeruser/route.ts
// ────────────────────────────────────────────────────────────────────
//  • Accepts multipart/form-data
//  • Saves uploaded photo to /public/uploads
//  • Inserts user + profiles in Prisma
//  • Generates one-time reset-link (no temp password)
//  • Sends link via central EmailService
// ────────────────────────────────────────────────────────────────────

import { NextResponse }            from "next/server";
import { PrismaClient, RoleName }  from "@prisma/client";
import * as bcrypt                 from "bcrypt";
import sendEmail                   from "@/services/EmailService";
import * as fs                     from "fs";
import * as path                   from "path";
import { randomUUID }              from "crypto";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // 1. Parse multipart form-data
    const form           = await req.formData();
    const roles          = form.getAll("roles").map(r => String(r).toUpperCase()) as RoleName[];
    const firstName      = String(form.get("firstName") || "").trim();
    const lastName       = String(form.get("lastName")  || "").trim();
    const email          = String(form.get("email")     || "").trim();
    const phone          = String(form.get("phone")     || "").trim();
    const position       = form.get("position") ? String(form.get("position")).trim() : null;
    const licenseNumber  = form.get("licenseNumber") ? String(form.get("licenseNumber")).trim() : null;
    const carMakeModel   = form.get("carMakeModel")    ? String(form.get("carMakeModel")).trim()  : null;
    const file           = form.get("photo")           as File | null;

    // Validate required fields
    if (!firstName || !lastName || !email || roles.length === 0) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Validate roles against enum
    const validRoles = roles.filter(r => Object.values(RoleName).includes(r));
    if (validRoles.length !== roles.length) {
      return NextResponse.json({ message: "Invalid roles provided" }, { status: 400 });
    }

    // 2. Persist uploaded photo (optional)
    let photoUrl = "";
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext    = path.extname(file.name) || ".jpg";
      const name   = `${randomUUID()}${ext}`;
      const dir    = path.join(process.cwd(), "public", "uploads");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), buffer);
      photoUrl = `/uploads/${name}`;
    }

    // 3. Generate a placeholder password (user must reset)
    const placeholder       = randomUUID();
    const hashedPlaceholder = await bcrypt.hash(placeholder, 10);

    // 4. Generate reset token + expiry
    const resetTokenPlain  = randomUUID();
    const resetTokenHash   = await bcrypt.hash(resetTokenPlain, 10);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // 5. Create user with placeholder password + reset token + roles
    const user = await prisma.user.create({
      data: {
        email,
        password:           hashedPlaceholder,
        firstName,
        lastName,
        phone,
        isVerified:         true,
        resetToken:         resetTokenHash,
        resetTokenExpiry,
        roles: {
          create: validRoles.map(roleName => ({
            role: { connect: { name: roleName } }
          })),
        },
      },
    });

    // 6. Upsert StaffProfile if STAFF role assigned
    if (validRoles.includes("STAFF")) {
      await prisma.staffProfile.upsert({
        where:  { userId: user.id },
        update: { photoUrl, position: position ?? "" },
        create: { userId: user.id, photoUrl, position: position ?? "" },
      });
    }

    // 7. Upsert DriverProfile if DRIVER role assigned
    if (validRoles.includes("DRIVER")) {
      await prisma.driverProfile.upsert({
        where:  { userId: user.id },
        update: {
          photoUrl,
          licenseNumber: licenseNumber ?? "",
          carMakeModel:  carMakeModel  ?? "",
        },
        create: {
          userId:        user.id,
          photoUrl,
          licenseNumber: licenseNumber ?? "",
          carMakeModel:  carMakeModel  ?? "",
        },
      });
    }

    // 8. Build & send the reset-password link email
    const baseUrl   = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${resetTokenPlain}&email=${encodeURIComponent(email)}`;
    const subject   = "Welcome to 19th-Hole – set your password";
    const text      = `Hi ${firstName},\n\nAn administrator created an account for you.\nPlease click the link below to choose your password (valid for one hour):\n${resetLink}\n\nRegards,\n19th-Hole Team`;
    const html      = `<p>Hi ${firstName},</p>
<p>An administrator created an account for you.</p>
<p>Please click <a href="${resetLink}">here</a> to choose your password (valid for one hour).</p>
<p>Regards,<br/>19th-Hole Team</p>`;

    await sendEmail(email, subject, text, html);

    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (err) {
    console.error("RegisterUser error:", err);
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
