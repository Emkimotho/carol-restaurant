/*
  Warnings:

  - You are about to drop the column `deliveryCity` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryState` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryStreet` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryZip` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "deliveryCity",
DROP COLUMN "deliveryState",
DROP COLUMN "deliveryStreet",
DROP COLUMN "deliveryZip";
