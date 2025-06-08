/*
  Warnings:

  - You are about to drop the column `orderType` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `taxAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `CloverCategoryMapping` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CloverCategoryMapping" DROP CONSTRAINT "CloverCategoryMapping_siteCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "CloverCategoryMapping" DROP CONSTRAINT "CloverCategoryMapping_siteSubcategoryId_fkey";

-- AlterTable
ALTER TABLE "DeliveryCharges" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MenuCategory" ADD COLUMN     "cloverCategoryId" TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "orderType",
DROP COLUMN "subtotal",
DROP COLUMN "taxAmount";

-- DropTable
DROP TABLE "CloverCategoryMapping";
