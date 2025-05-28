/*
  Warnings:

  - You are about to drop the column `assignedStaffId` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "assignedStaffId",
ADD COLUMN     "customerDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "driverPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "restaurantDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tipAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "totalAmount" SET DEFAULT 0;
