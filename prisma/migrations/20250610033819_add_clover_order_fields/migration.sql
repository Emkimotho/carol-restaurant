/*
  Warnings:

  - A unique constraint covering the columns `[cloverOrderId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cloverLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "cloverOrderId" TEXT;

-- AlterTable
ALTER TABLE "OrderLineItem" ADD COLUMN     "cloverLineItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_cloverOrderId_key" ON "Order"("cloverOrderId");
