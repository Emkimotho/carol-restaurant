// File: app/api/admin/subscriptions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // ← named export from lib/prisma

// GET → return all subscribers, sorted by createdAt
export async function GET() {
  try {
    // Log when the handler is invoked
    console.log("→ GET /api/admin/subscriptions called");

    // Attempt to fetch from the database
    const subs = await prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
    });

    console.log("→ Found subscriptions count:", subs.length);
    return NextResponse.json(subs);
  } catch (err) {
    // Log the full error so you can inspect it in the terminal
    console.error("🔥 ERROR in GET /api/admin/subscriptions:", err);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions." },
      { status: 500 }
    );
  }
}

// DELETE → remove a subscription by id ?id=123
export async function DELETE(request: Request) {
  try {
    console.log("→ DELETE /api/admin/subscriptions called");

    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");
    if (!idParam) {
      console.warn("→ DELETE missing id param");
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      console.warn("→ DELETE invalid id param:", idParam);
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const deleted = await prisma.subscription.delete({ where: { id } });
    console.log("→ Deleted subscription id:", deleted.id);
    return NextResponse.json(deleted);
  } catch (err) {
    console.error("🔥 ERROR in DELETE /api/admin/subscriptions:", err);
    return NextResponse.json(
      { error: "Failed to delete subscription." },
      { status: 500 }
    );
  }
}
