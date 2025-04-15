import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Parse request body for email and password.
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Look up the user by email and select necessary fields including isVerified.
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        isVerified: true, // Ensure this field is present
        roles: { 
          select: { 
            role: { select: { name: true } } 
          } 
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if the user has verified their email.
    if (!user.isVerified) {
      return NextResponse.json(
        { message: "Please verify your email before logging in" },
        { status: 403 }
      );
    }

    // Compare the provided password with the hashed password in the database.
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Ensure that the JWT secret is set.
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in your environment variables");
    }

    // Generate a JWT token using the secret from the environment.
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Prepare a JSON response with user details (include roles).
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map((ur) => ur.role.name),
      },
    });

    // Set an HTTP-only cookie named "token" with the JWT.
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
