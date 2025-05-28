-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryDistanceMiles" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryTimeMinutes" INTEGER NOT NULL DEFAULT 0;
