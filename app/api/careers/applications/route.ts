// File: app/api/careers/applications/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma }                  from "@/lib/prisma";
import sendEmail                   from "@/services/EmailService";
import { v2 as cloudinary }        from "cloudinary";

export const config = { api: { bodyParser: false } };

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/* ===================================================================
   GET /api/careers/applications
   =================================================================== */
export async function GET(_: NextRequest) {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ applications }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /applications] error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ===================================================================
   POST /api/careers/applications
   • Accepts JSON or multipart/form-data
   • Uploads resume to Cloudinary via data URI (supports images, PDFs,
     Word, Excel, etc.)
   • Persists the secure URL in Prisma
   • Sends emails to applicant and HR
   =================================================================== */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  let firstName: string;
  let lastName:  string;
  let email:     string;
  let jobTitle:  string;
  let resumeUrl: string;

  /* -------- JSON payload -------- */
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      ({ firstName, lastName, email, jobTitle, resumeUrl } = body);
    } catch (err: any) {
      return NextResponse.json(
        { message: "Invalid JSON body" },
        { status: 400 }
      );
    }
  }
  /* -------- multipart/form-data payload -------- */
  else if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();

    firstName = form.get("firstName")?.toString() ?? "";
    lastName  = form.get("lastName")?.toString()  ?? "";
    email     = form.get("email")?.toString()     ?? "";
    jobTitle  = form.get("jobTitle")?.toString()  ?? "";

    // file input field may be named "resumeUrl" or "attachment"
    const file =
      (form.get("resumeUrl")  as File | null) ||
      (form.get("attachment") as File | null);

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Read file into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Build a data URI so Cloudinary can detect raw vs image automatically
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    try {
      const result: any = await cloudinary.uploader.upload(dataUri, {
        folder:        "resumes",
        resource_type: "auto",
      });
      resumeUrl = result.secure_url;
    } catch (uploadErr: any) {
      console.error("[Cloudinary] upload error:", uploadErr);
      return NextResponse.json(
        { message: "Failed to upload resume" },
        { status: 500 }
      );
    }
  }
  /* -------- unsupported content type -------- */
  else {
    return NextResponse.json(
      { message: "Unsupported Content-Type" },
      { status: 415 }
    );
  }

  /* -------- validation -------- */
  if (!firstName || !lastName || !email || !jobTitle || !resumeUrl) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  /* -------- save to database -------- */
  let application;
  try {
    application = await prisma.application.create({
      data: {
        applicantName: `${firstName} ${lastName}`,
        email,
        jobTitle,
        resumeUrl,
      },
    });
  } catch (dbErr: any) {
    console.error("[POST /applications] prisma error:", dbErr);
    return NextResponse.json(
      { message: "Database error" },
      { status: 500 }
    );
  }

  /* -------- email notifications -------- */
  const subjA = `Your application for ${jobTitle}`;
  const htmlA = `
    <p>Hi ${firstName},</p>
    <p>Thank you for applying for the <strong>${jobTitle}</strong> position. We will review your application and contact you soon.</p>
    <p>Best regards,<br/>19th-Hole HR Team</p>
  `;
  sendEmail(email, subjA, subjA, htmlA).catch(console.error);

  const hrEmail = process.env.ADMIN_EMAIL;
  if (hrEmail) {
    const subjHR = `New application – ${firstName} ${lastName}`;
    const htmlHR = `
      <p>A new job application has been submitted:</p>
      <ul>
        <li><strong>Name:</strong> ${firstName} ${lastName}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Position:</strong> ${jobTitle}</li>
        <li><strong>Résumé:</strong> <a href="${resumeUrl}">Download</a></li>
      </ul>
    `;
    sendEmail(hrEmail, subjHR, subjHR, htmlHR).catch(console.error);
  }

  return NextResponse.json({ application }, { status: 201 });
}
