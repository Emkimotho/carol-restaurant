-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_bookingId_fkey";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "rsvpId" TEXT,
ALTER COLUMN "bookingId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_rsvpId_fkey" FOREIGN KEY ("rsvpId") REFERENCES "RSVP"("id") ON DELETE SET NULL ON UPDATE CASCADE;
