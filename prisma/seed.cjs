const { PrismaClient, RoleName } = require('@prisma/client');
const prisma = new PrismaClient();

// Define an array of role names as strings
/** @type {RoleName[]} */
const roleNames = ['SUPERADMIN', 'ADMIN', 'STAFF', 'DRIVER', 'CUSTOMER'];

async function main() {
  for (const roleName of roleNames) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }
  console.log('Default roles seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
