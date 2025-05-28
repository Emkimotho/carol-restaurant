// File: prisma/seed.cjs
const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const toSeed = [Prisma.RoleName.SERVER, Prisma.RoleName.CASHIER];
  for (const name of toSeed) {
    await prisma.role.upsert({
      where: { name },    // now pulls name from Prisma.RoleName.SERVER / CASHIER
      update: {},         
      create: { name },
    });
  }

  // ...any other seed logic you already have
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
