-- CreateEnum
CREATE TYPE "PayoutCategory" AS ENUM ('DRIVER_PAYOUT', 'STAFF_TIP', 'SERVER_TIP', 'CASHIER_TIP', 'ADMIN_TIP', 'OTHER');

-- AlterTable
ALTER TABLE "DeliveryCharges" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MenuItemOptionGroup" ADD COLUMN     "cloverGroupId" TEXT;

-- AlterTable
ALTER TABLE "MenuOptionChoice" ADD COLUMN     "cloverModifierId" TEXT;

-- AlterTable
ALTER TABLE "NestedOptionChoice" ADD COLUMN     "cloverModifierId" TEXT;

-- AlterTable
ALTER TABLE "NestedOptionGroup" ADD COLUMN     "cloverGroupId" TEXT;

-- CreateTable
CREATE TABLE "Payout" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "PayoutCategory" NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuPreviewItem" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuPreviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payout_userId_idx" ON "Payout"("userId");

-- CreateIndex
CREATE INDEX "Payout_orderId_idx" ON "Payout"("orderId");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
