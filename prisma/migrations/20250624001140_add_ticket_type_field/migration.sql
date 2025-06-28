/*
  Warnings:

  - Added the required column `ticketType` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('ADULT', 'KID');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "ticketType" "TicketType" NOT NULL;
