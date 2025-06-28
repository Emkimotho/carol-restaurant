/*
  Warnings:

  - Added the required column `updatedAt` to the `RSVP` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RSVP" DROP CONSTRAINT "RSVP_eventId_fkey";

-- AlterTable
ALTER TABLE "RSVP" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "RSVP_eventId_idx" ON "RSVP"("eventId");

-- CreateIndex
CREATE INDEX "RSVP_email_idx" ON "RSVP"("email");

-- AddForeignKey
ALTER TABLE "RSVP" ADD CONSTRAINT "RSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
