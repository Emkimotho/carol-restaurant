/*
  Warnings:

  - You are about to drop the column `driverPayout` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "driverPayout",
ADD COLUMN     "additionalAmountForFree" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "discountSaved" DOUBLE PRECISION,
ADD COLUMN     "freeDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
