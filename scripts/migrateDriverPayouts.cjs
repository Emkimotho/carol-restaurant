// File: scripts/migrateDriverPayouts.cjs
const { PrismaClient, PayoutCategory } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1) Driver payouts
  const driverOrders = await prisma.order.findMany({
    where: { driverPayout: { gt: 0 }, driverId: { not: null }, deliveredAt: { not: null } },
    select: { id: true, driverId: true, driverPayout: true },
  });

  let migratedDriver = 0;
  for (const { id: orderId, driverId, driverPayout } of driverOrders) {
    const exists = await prisma.payout.findFirst({
      where: { orderId, category: PayoutCategory.DRIVER_PAYOUT },
    });
    if (exists) continue;
    await prisma.payout.create({
      data: {
        userId:   driverId,
        orderId,
        amount:   driverPayout,
        category: PayoutCategory.DRIVER_PAYOUT,
        paid:     false,
      },
    });
    migratedDriver++;
  }

  // 2) Server tip payouts
  const tipOrders = await prisma.order.findMany({
    where: { tipAmount: { gt: 0 }, staffId: { not: null }, deliveredAt: { not: null } },
    select: { id: true, staffId: true, tipAmount: true },
  });

  let migratedServer = 0;
  for (const { id: orderId, staffId, tipAmount } of tipOrders) {
    const exists = await prisma.payout.findFirst({
      where: { orderId, category: PayoutCategory.SERVER_TIP },
    });
    if (exists) continue;
    await prisma.payout.create({
      data: {
        userId:   staffId,
        orderId,
        amount:   tipAmount,
        category: PayoutCategory.SERVER_TIP,
        paid:     false,
      },
    });
    migratedServer++;
  }

  console.log(`✅ Migrated ${migratedDriver} driver payouts and ${migratedServer} server‐tip payouts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
