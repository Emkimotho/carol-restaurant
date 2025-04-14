import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sendEmail from "@/services/EmailService";

export async function GET() {
  try {
    const applications = await prisma.application.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ applications });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const firstName = formData.get("firstName")?.toString();
    const lastName = formData.get("lastName")?.toString();
    const email = formData.get("email")?.toString();
    const jobTitle = formData.get("jobTitle")?.toString();
    const attachment = formData.get("attachment");
    const resumeUrl =
      attachment instanceof File ? `/uploads/${attachment.name}` : "";

    const application = await prisma.application.create({
      data: {
        applicantName: `${firstName} ${lastName}`,
        email,
        jobTitle,
        resumeUrl,
      },
    });

    const subject = `Application Received for ${jobTitle}`;
    const text = `Dear ${firstName},\n\nThank you for applying for the position of ${jobTitle} at 19th Hole Restaurant at Black Rock. We have received your application and will get back to you shortly.\n\nBest regards,\n19th Hole Restaurant at Black Rock`;
    const html = `<p>Dear ${firstName},</p>
                  <p>Thank you for applying for the position of <strong>${jobTitle}</strong> at <strong>19th Hole Restaurant at Black Rock</strong>. We have received your application and will reach out if you qualify.</p>
                  <p>Best regards,<br>19th Hole Restaurant at Black Rock</p>`;

    await sendEmail(email, subject, text, html);

    return NextResponse.json({ application });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
