/*
  Warnings:

  - You are about to drop the column `time` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "time",
ADD COLUMN     "endTime" TEXT NOT NULL DEFAULT '00:00',
ADD COLUMN     "kidPriceInfo" TEXT,
ADD COLUMN     "startTime" TEXT NOT NULL DEFAULT '00:00';

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
