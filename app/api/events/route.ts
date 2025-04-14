import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const title = formData.get("title")?.toString();
    const description = formData.get("description")?.toString();

    const street = formData.get("street")?.toString();
    const city = formData.get("city")?.toString();
    const state = formData.get("state")?.toString();
    const zip = formData.get("zip")?.toString();

    const date = formData.get("date")?.toString();
    const time = formData.get("time")?.toString();

    // Convert pricing and tickets fields.
    const adultPrice = parseFloat(formData.get("adultPrice")?.toString() || "0");
    const kidPrice = parseFloat(formData.get("kidPrice")?.toString() || "0");
    const availableTickets = parseInt(formData.get("availableTickets")?.toString() || "0");

    // Convert boolean fields.
    const isFree = formData.get("isFree") === "true";
    const adultOnly = formData.get("adultOnly") === "true";

    if (!street || !city || !state || !zip) {
      return new Response(JSON.stringify({ message: "Missing address fields" }), { status: 400 });
    }
    const location = `${street}, ${city}, ${state} ${zip}`;

    if (!date || !time) {
      return new Response(JSON.stringify({ message: "Missing date or time" }), { status: 400 });
    }
    const dateTimeString = `${date}T${time}`;
    const eventDateTime = new Date(dateTimeString);
    if (isNaN(eventDateTime.getTime())) {
      return new Response(JSON.stringify({ message: "Invalid date/time format" }), { status: 400 });
    }

    // Handle file upload (if provided): store only the file name.
    let imageUrl: string | null = null;
    const imageFile = formData.get("image");
    if (imageFile && imageFile instanceof File) {
      imageUrl = imageFile.name; // Save only the file name, not the path prefix.
    }

    if (!title || !description) {
      return new Response(JSON.stringify({ message: "Missing required fields" }), { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        date: eventDateTime,
        time,
        adultPrice,
        kidPrice,
        availableTickets,
        image: imageUrl,
        isFree,
        adultOnly,
      },
    });

    return new Response(JSON.stringify({ event }), { status: 201 });
  } catch (error: any) {
    console.error("Error creating event:", error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: "asc" },
    });
    // Normalize each event's image field to remove any /images/ or uploads/ prefixes.
    const transformedEvents = events.map((ev) => ({
      ...ev,
      image: ev.image ? ev.image.replace(/^\/?images\/|^uploads\//, "") : null,
      date: ev.date.toISOString(),
    }));
    return new Response(JSON.stringify({ events: transformedEvents }), { status: 200 });
  } catch (error: any) {
    console.error("Error fetching events:", error);
    return new Response(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
