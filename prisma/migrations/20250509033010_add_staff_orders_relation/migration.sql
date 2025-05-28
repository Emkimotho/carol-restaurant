-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "staffId" INTEGER;

-- CreateIndex
CREATE INDEX "Order_staffId_idx" ON "Order"("staffId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
