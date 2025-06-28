/* =======================================================================
   File: app/api/careers/applications/route.ts
   -----------------------------------------------------------------------
   • GET  – return all applications (unchanged)
   • POST – now handles BOTH JSON *and* multipart/form-data:
       – Accepts <input type="file" name="resumeUrl"> (or "attachment")
       – Saves the file to /public/uploads/resumes
       – Persists the public URL in Prisma
       – Fires e-mails to the applicant and HR
   ---------------------------------------------------------------------- */

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import sendEmail        from "@/services/EmailService";

import fs   from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

/* Where résumé files will live (under /public so Next can serve them) */
const UPLOAD_DIR = path.join(process.cwd(), "public/uploads/resumes");

/* =================================================================== */
/*  GET /api/careers/applications                                      */
/* =================================================================== */
export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ applications });
  } catch (err: any) {
    console.error("[GET /applications] error:", err);
    return NextResponse.json(
      { message: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

/* =================================================================== */
/*  POST /api/careers/applications                                     */
/* =================================================================== */
export async function POST(request: Request) {
  try {
    const cType = request.headers.get("content-type") || "";

    /* ───────────── 1. Extract fields ───────────── */
    let firstName: string | undefined;
    let lastName:  string | undefined;
    let email:     string | undefined;
    let jobTitle:  string | undefined;
    let resumeUrl: string | undefined;

    /* -- A) JSON ---------------------------------------------------------------- */
    if (cType.includes("application/json")) {
      ({ firstName, lastName, email, jobTitle, resumeUrl } = await request.json());
    }

    /* -- B) multipart/form-data -------------------------------------------------- */
    else if (cType.includes("multipart/form-data")) {
      const form = await request.formData();

      firstName = form.get("firstName") as string | undefined;
      lastName  = form.get("lastName")  as string | undefined;
      email     = form.get("email")     as string | undefined;
      jobTitle  = form.get("jobTitle")  as string | undefined;

      /* Accept either <input name="resumeUrl"> or "attachment" for the file */
      const file = (form.get("resumeUrl") || form.get("attachment")) as
        | File
        | string
        | null;

      if (typeof file === "string") {
        /* Front-end already sent a URL – keep it */
        resumeUrl = file;
      } else if (file instanceof File) {
        /* Save the uploaded file to /public/uploads/resumes */
        await fs.mkdir(UPLOAD_DIR, { recursive: true });

        const ext = path.extname(file.name) || ".bin";
        const filename = `${uuid()}${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        /* Write file contents */
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filepath, buffer);

        /* Public URL that <a href> can open */
        resumeUrl = `/uploads/resumes/${filename}`;
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported Content-Type" },
        { status: 415 }
      );
    }

    /* ───────────── 2. Validation ───────────── */
    if (!firstName || !lastName || !email || !jobTitle || !resumeUrl) {
      return NextResponse.json(
        { error: "Missing one or more required fields" },
        { status: 400 }
      );
    }

    /* ───────────── 3. Save to Prisma ───────────── */
    const application = await prisma.application.create({
      data: {
        applicantName: `${firstName} ${lastName}`,
        email,
        jobTitle,
        resumeUrl,
      },
    });

    /* ───────────── 4. E-mail notifications (fire-and-forget) ───────────── */
    const applicantSubj = `Your application for ${jobTitle}`;
    const applicantHtml = `
      <p>Hi ${firstName},</p>
      <p>Thank you for applying for the <strong>${jobTitle}</strong> position at 19th-Hole Restaurant.
         Our hiring team will review your application and contact you soon.</p>
      <p>Best regards,<br/>19th-Hole HR Team</p>
    `;
    sendEmail(email, applicantSubj, applicantSubj, applicantHtml).catch(console.error);

    const hrEmail = process.env.ADMIN_EMAIL;
    if (hrEmail) {
      const hrSubj = `New application – ${firstName} ${lastName} (${jobTitle})`;
      const hrHtml = `
        <p>A new job application has been submitted.</p>
        <ul>
          <li><strong>Name:</strong> ${firstName} ${lastName}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Job Title:</strong> ${jobTitle}</li>
          <li><strong>Résumé:</strong> <a href="${resumeUrl}">View</a></li>
        </ul>
      `;
      sendEmail(hrEmail, hrSubj, hrSubj, hrHtml).catch(console.error);
    }

    /* ───────────── 5. Respond OK ───────────── */
    return NextResponse.json(application);
  } catch (err: any) {
    console.error("[POST /applications] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
