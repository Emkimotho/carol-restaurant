import { NextResponse } from "next/server";
import sendEmail from "@/services/emailService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, text, html } = body;
    
    // Call your email service (which uses nodemailer) on the server.
    await sendEmail(to, subject, text, html);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in send-email API:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
