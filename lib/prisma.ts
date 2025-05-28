// File: lib/prisma.ts

import { PrismaClient } from "@prisma/client";

/**
 * Build the database URL, preferring DIRECT_DATABASE_URL if set,
 * otherwise falling back to DATABASE_URL.
 * Ensures `prepared_statements=false` is appended if not already present.
 */
function getDatabaseUrl(): string {
  const rawUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error(
      "Neither DIRECT_DATABASE_URL nor DATABASE_URL environment variable is defined"
    );
  }

  const url = new URL(rawUrl);
  if (!url.searchParams.has("prepared_statements")) {
    url.searchParams.append("prepared_statements", "false");
  }
  return url.toString();
}

// In development, attach the Prisma client to the global object to prevent
// exhausting database connections on hot-reload.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaClient =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: { url: getDatabaseUrl() },
    },
    // Uncomment the following line to enable detailed query logging:
    // log: ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prismaClient;
}

/**
 * Default export: import prismaClient via
 *   import prisma from "@/lib/prisma";
 */
export default prismaClient;

/**
 * Named export: import { prisma } via
 *   import { prisma } from "@/lib/prisma";
 */
export const prisma = prismaClient;
