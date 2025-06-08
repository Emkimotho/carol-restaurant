// File: prisma/seed.cjs
//
// • Seeds ALL roles from the RoleName enum.
// • Then upserts one “admin” user (emiliomunene@gmail.com / password123).
//   That user is assigned the ADMIN role via a nested UserRole create.

const { PrismaClient, RoleName } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // 1) Upsert all enum roles (8 total)
  const allRoles = Object.values(RoleName);
  console.log('⏳ Seeding roles:', allRoles);

  for (const name of allRoles) {
    await prisma.role.upsert({
      where:  { name },
      update: {},
      create: { name },
    });
  }
  console.log('✅ Roles seeded.');

  // 2) Upsert one admin user
  const adminEmail = 'emiliomunene@gmail.com';
  const plainPassword = 'password123';

  // Hash the password with bcrypt
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // Upsert the user by email
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      // If you want to update other fields, do so here
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Emilio',
      lastName: 'Munene',
      isVerified: true,
      // You can set other optional fields: streetAddress, city, etc.

      // Nested create of UserRole to assign ADMIN role
      roles: {
        create: [
          {
            role: {
              connect: { name: RoleName.ADMIN }
            }
          }
        ]
      }
    },
    include: {
      roles: { include: { role: true } }
    }
  });

  console.log(`✅ Upserted admin user (${adminEmail}), roles:`, user.roles.map(r => r.role.name));
}

main()
  .then(() => {
    console.log('🎉 Seed script finished successfully.');
  })
  .catch((err) => {
    console.error('❌ Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
