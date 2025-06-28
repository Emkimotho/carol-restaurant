// File: scripts/findMissingCashCollections.js
/**
 * Script to list delivered CASH orders missing a cashCollection.
 * Usage: node scripts/findMissingCashCollections.js
 */

const { PrismaClient, OrderStatus, PaymentMethod } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const missing = await prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        paymentMethod: PaymentMethod.CASH,
        cashCollection: { is: null },
      },
      select: {
        id: true,
        orderId: true,
        totalAmount: true,
        cloverOrderId: true,
        createdAt: true,
        staffId: true,
        driverId: true,
      },
      orderBy: { deliveredAt: "desc" },
    });

    console.log(`Found ${missing.length} delivered CASH orders without cashCollection:`);
    missing.forEach((o, idx) => {
      console.log(
        `${idx + 1}. orderId=${o.orderId}, totalAmount=$${o.totalAmount.toFixed(2)}, ` +
        `cloverOrderId=${o.cloverOrderId ?? "<none>"}, createdAt=${o.createdAt}` +
        (o.staffId ? `, staffId=${o.staffId}` : "") +
        (o.driverId ? `, driverId=${o.driverId}` : "")
      );
    });
  } catch (e) {
    console.error("Error querying missing cashCollections:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
