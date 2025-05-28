// File: app/api/payouts/pdf/route.ts
import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/lib/auth";
import puppeteer            from "puppeteer";

export const runtime = "nodejs";

export async function GET(req: Request) {
  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });
  }

  // 2. Rebuild query (paid, userId, from, to)
  const url   = new URL(req.url);
  const parts = [
    url.searchParams.has("paid")   ? `paid=${url.searchParams.get("paid")}`   : null,
    url.searchParams.has("userId") ? `userId=${url.searchParams.get("userId")}` : null,
    url.searchParams.has("from")   ? `from=${url.searchParams.get("from")}`   : null,
    url.searchParams.has("to")     ? `to=${url.searchParams.get("to")}`       : null,
    "print=true",
  ].filter(Boolean).join("&");

  // 3. Point to your printable page
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const target = `${base}/dashboard/admin-dashboard/payouts?${parts}`;

  // 4. Launch Puppeteer
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(target, { waitUntil: "networkidle0" });

    // 5. PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1in", bottom: "1in", left: "0.5in", right: "0.5in" },
    });

    // 6. Stream the Uint8Array directly
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="payouts-statement.pdf"`,
        "Content-Length":      pdfBuffer.length.toString(),
      },
    });
  } finally {
    await browser.close();
  }
}
