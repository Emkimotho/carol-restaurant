// File: app/api/auth/updated-password/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  console.log("🛠️  [updated-password] Handler start");

  let body: any;
  try {
    body = await request.json();
    console.log("📥  Request body:", body);
  } catch (err) {
    console.error("❌  Failed to parse JSON body:", err);
    return NextResponse.json(
      { message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { token, email, newPassword } = body;
  console.log(
    "🔑  Parsed fields →",
    "token?", !!token,
    "email?", !!email,
    "newPassword?", !!newPassword
  );

  if (!token || !email || !newPassword) {
    console.warn("⚠️  Missing one or more required fields:", {
      tokenMissing: !token,
      emailMissing: !email,
      newPasswordMissing: !newPassword,
    });
    return NextResponse.json(
      { message: "token, email and newPassword are required" },
      { status: 400 }
    );
  }

  // 1) Find user with a still‑valid resetTokenExpiry
  const now = new Date();
  const user = await prisma.user.findFirst({
    where: {
      email,
      resetTokenExpiry: { gt: now },
    },
  });
  console.log("👤  Lookup user by email & valid expiry:", user ? "FOUND" : "NOT FOUND");

  if (!user || !user.resetToken) {
    console.warn("⚠️  No user or no resetToken on record (or token expired)");
    return NextResponse.json(
      { message: "Invalid or expired token" },
      { status: 400 }
    );
  }

  console.log(
    "🗂️  User.resetToken (hash):",
    user.resetToken,
    "\n  expiry:",
    user.resetTokenExpiry
  );

  // 2) Compare provided token with stored hash
  let match = false;
  try {
    match = await bcrypt.compare(token, user.resetToken);
  } catch (err) {
    console.error("❌  bcrypt.compare error:", err);
  }
  console.log("✅  Token compare result:", match);

  if (!match) {
    console.warn("⚠️  Token did not match hash");
    return NextResponse.json(
      { message: "Invalid or expired token" },
      { status: 400 }
    );
  }

  // 3) Hash the new password
  console.log("🔐  Hashing new password…");
  let hashedPassword: string;
  try {
    hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log("🔑  New password hash:", hashedPassword);
  } catch (err) {
    console.error("❌  bcrypt.hash error:", err);
    return NextResponse.json(
      { message: "Failed to hash password" },
      { status: 500 }
    );
  }

  // 4) Update user record
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
    console.log("🎉  Password updated and reset fields cleared for user ID", user.id);
  } catch (err) {
    console.error("❌  Prisma update error:", err);
    return NextResponse.json(
      { message: "Failed to update user password" },
      { status: 500 }
    );
  }

  console.log("🛠️  [updated-password] Handler end — returning success");
  return NextResponse.json(
    { message: "Password updated successfully." },
    { status: 200 }
  );
}
