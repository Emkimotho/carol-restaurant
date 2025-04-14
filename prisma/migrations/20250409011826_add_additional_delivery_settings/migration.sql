/*
  Warnings:

  - Added the required column `freeDeliveryThreshold` to the `DeliveryCharges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minimumCharge` to the `DeliveryCharges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurantFeePercentage` to the `DeliveryCharges` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DeliveryCharges" ADD COLUMN     "freeDeliveryThreshold" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "minimumCharge" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "restaurantFeePercentage" DOUBLE PRECISION NOT NULL;
