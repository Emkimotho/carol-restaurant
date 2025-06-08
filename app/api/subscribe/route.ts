// File: app/api/subscribe/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Normalize email
    const normalized = email.toLowerCase().trim();

    try {
      const sub = await prisma.subscription.create({
        data: { email: normalized },
      });
      return NextResponse.json(sub, { status: 201 });
    } catch (err: any) {
      // Unique constraint error code P2002 → duplicate email
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "This email is already subscribed." },
          { status: 409 }
        );
      }
      console.error("Prisma create subscription error:", err);
      return NextResponse.json(
        { error: "Failed to create subscription." },
        { status: 500 }
      );
    }
  } catch (outer) {
    console.error("subscribe POST error:", outer);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
