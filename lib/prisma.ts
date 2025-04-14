// File: lib/prisma.ts

import { PrismaClient } from "@prisma/client";

/**
 * Helper function to get the database URL with prepared_statements disabled.
 */
function getDatabaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }
  const url = new URL(process.env.DATABASE_URL);

  // If 'prepared_statements' is not in the URL, append it
  if (!url.searchParams.has("prepared_statements")) {
    url.searchParams.append("prepared_statements", "false");
  }

  return url.toString();
}

// Use a global variable to preserve the Prisma client in development
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Create the client if it's not already cached in `globalForPrisma`
const prismaClient =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    // Uncomment to enable detailed logs:
    // log: ["query", "info", "warn", "error"],
  });

// Reuse the instance in development to avoid exhausting DB connections
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}

/**
 * Named export: If you want `import { prisma } from "@/lib/prisma"`.
 */
export const prisma = prismaClient;

/**
 * Default export: If you want `import prisma from "@/lib/prisma"`.
 */
export default prismaClient;
