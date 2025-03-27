// File: prisma/seed.cjs

const { PrismaClient, RoleName } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Define default roles
const roleNames = ['SUPERADMIN', 'ADMIN', 'STAFF', 'DRIVER', 'CUSTOMER'];

async function main() {
  // Upsert roles
  for (const roleName of roleNames) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }
  console.log('Default roles seeded');

  // Admin account credentials (update as needed)
  const adminEmail = 'admin@example.com';
  const adminPassword = 'password123';

  // Check if an admin account exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    // Hash the admin's password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create the admin user and mark as verified
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isVerified: true,
      },
    });

    // Find the ADMIN role
    const adminRole = await prisma.role.findUnique({
      where: { name: RoleName.ADMIN },
    });

    // Create the user-role connection
    if (adminRole) {
      await prisma.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      });
    }
    console.log('Admin account created.');
  } else {
    console.log('Admin account already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
