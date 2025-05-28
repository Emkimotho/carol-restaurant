// File: services/EmailService.ts
// ──────────────────────────────────────────────────
// Email sending service using Nodemailer
// ──────────────────────────────────────────────────

// @ts-ignore: no type declarations for 'nodemailer'
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<void> => {
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${to}`);
  } catch (err) {
    console.error("Error sending email:", err);
  }
};

export default sendEmail;
