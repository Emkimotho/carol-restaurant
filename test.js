// test.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
console.log("PrismaClient loaded successfully:", Boolean(prisma));
