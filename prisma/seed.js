// File: prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const ev = await prisma.event.create({
    data: {
      title:            "Test Event",
      description:      "Quick seed",
      location:         "Test Venue",
      date:             new Date("2025-07-01T18:00:00Z"),
      startTime:        "18:00",
      endTime:          "20:00",
      adultPrice:       45,
      kidPrice:         20,
      availableTickets: 100,
      isFree:           false,
      adultOnly:        false,
    },
  });
  console.log("Seeded event:", ev.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
