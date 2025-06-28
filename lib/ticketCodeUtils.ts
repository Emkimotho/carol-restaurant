// File: lib/ticketCodeUtils.ts

import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma"; // Adjust path if your prisma client is exported elsewhere

// Characters to use in ticket codes, excluding ambiguous ones (0/O, 1/I, etc.)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const MAX_GENERATION_ATTEMPTS = 10;

/**
 * Normalize a ticket code for lookup:
 * - Remove non-alphanumeric characters
 * - Uppercase everything
 */
export function normalizeCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

/**
 * Generate a random, 8‐character alphanumeric code using the defined alphabet.
 */
export function generateTicketCode(): string {
  let code = "";
  const alphaLen = ALPHABET.length;
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * alphaLen);
    code += ALPHABET[idx];
  }
  return code;
}

/**
 * Type alias for the Prisma transaction client.
 * Prisma.TransactionClient is the type for the `tx` inside prisma.$transaction(async (tx) => { ... }).
 */
type TxClient = Prisma.TransactionClient;

/**
 * Acceptable DB client type: either the main PrismaClient instance or a transaction client.
 */
export type PrismaOrTransaction = typeof prisma | TxClient;

/**
 * Generate a unique ticket code, checking against the database to avoid collisions.
 *
 * @param db - Your Prisma client or transaction instance (must have a `.ticket` delegate)
 * @returns A promise that resolves to a unique code
 * @throws Error if a unique code cannot be generated after MAX_GENERATION_ATTEMPTS
 */
export async function generateUniqueTicketCode(db: PrismaOrTransaction): Promise<string> {
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateTicketCode();
    const existing = await db.ticket.findUnique({ where: { code } });
    if (!existing) {
      return code;
    }
    // else try again
  }
  throw new Error(
    `Failed to generate a unique ticket code after ${MAX_GENERATION_ATTEMPTS} attempts`
  );
}
