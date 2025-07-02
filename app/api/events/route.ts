// File: app/api/events/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function GET(request: Request) {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: "asc" },
      include: { faqs: true },
    });
    const transformed = events.map((ev) => ({
      id: ev.id,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      date: ev.date.toISOString(),
      startTime: ev.startTime,
      endTime: ev.endTime,
      adultPrice: ev.adultPrice,
      kidPrice: ev.kidPrice,
      kidPriceInfo: ev.kidPriceInfo,
      availableTickets: ev.availableTickets,
      imageUrl: ev.imageUrl,
      cloudinaryPublicId: ev.cloudinaryPublicId,
      isFree: ev.isFree,
      adultOnly: ev.adultOnly,
      faqs: ev.faqs.map((fq) => ({
        id: fq.id,
        question: fq.question,
        answer: fq.answer,
      })),
      createdAt: ev.createdAt.toISOString(),
      updatedAt: ev.updatedAt.toISOString(),
    }));
    return NextResponse.json({ events: transformed }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // Required text fields
    const title       = formData.get("title")?.toString();
    const description = formData.get("description")?.toString();
    if (!title || !description) {
      return NextResponse.json({ message: "Missing title or description" }, { status: 400 });
    }

    // Address fields
    const street = formData.get("street")?.toString();
    const city   = formData.get("city")?.toString();
    const state  = formData.get("state")?.toString();
    const zip    = formData.get("zip")?.toString();
    if (!street || !city || !state || !zip) {
      return NextResponse.json({ message: "Missing address fields" }, { status: 400 });
    }
    const location = `${street}, ${city}, ${state} ${zip}`;

    // Date/time
    const dateRaw      = formData.get("date")?.toString();
    const startTimeRaw = formData.get("startTime")?.toString();
    const endTimeRaw   = formData.get("endTime")?.toString();
    const fallbackTime = formData.get("time")?.toString();
    if (!dateRaw) {
      return NextResponse.json({ message: "Missing date" }, { status: 400 });
    }
    const startTime = startTimeRaw || fallbackTime;
    const endTime   = endTimeRaw   || fallbackTime;
    if (!startTime || !endTime) {
      return NextResponse.json({ message: "Missing startTime or endTime" }, { status: 400 });
    }
    const eventDateTime = new Date(`${dateRaw}T${startTime}`);
    if (isNaN(eventDateTime.getTime())) {
      return NextResponse.json({ message: "Invalid date or startTime format" }, { status: 400 });
    }

    // Pricing & tickets
    const adultPrice       = parseFloat(formData.get("adultPrice")?.toString()    || "0");
    const kidPrice         = parseFloat(formData.get("kidPrice")?.toString()      || "0");
    const availableTickets = parseInt  (formData.get("availableTickets")?.toString() || "0");
    const kidPriceInfo     = formData.get("kidPriceInfo")?.toString() || "";

    const isFree    = formData.get("isFree")    === "true";
    const adultOnly = formData.get("adultOnly") === "true";

    // FAQs JSON
    let faqsData: { question: string; answer: string }[] = [];
    const faqsRaw = formData.get("faqs")?.toString();
    if (faqsRaw) {
      try {
        faqsData = JSON.parse(faqsRaw);
      } catch {
        return NextResponse.json({ message: "Invalid FAQs format" }, { status: 400 });
      }
    }

    // Image upload
    let imageUrl: string | null = null;
    let cloudinaryPublicId: string | null = null;
    const imageFile = formData.get("image");
    if (imageFile instanceof Blob) {
      // convert to base64 data URI
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const dataUri = `data:${imageFile.type};base64,${buffer.toString("base64")}`;

      // upload
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: "events",
        public_id: `${Date.now()}`,
        overwrite: true,
      });
      imageUrl = uploadResult.secure_url;
      cloudinaryPublicId = uploadResult.public_id;
    }

    // Persist event
    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        date: eventDateTime,
        startTime,
        endTime,
        adultPrice,
        kidPrice,
        kidPriceInfo,
        availableTickets,
        imageUrl,
        cloudinaryPublicId,
        isFree,
        adultOnly,
        faqs: {
          create: faqsData.map((fq) => ({
            question: fq.question,
            answer:   fq.answer,
          })),
        },
      },
      include: { faqs: true },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating event:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
