-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "driverPayout" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "MenuCategory_type_idx" ON "MenuCategory"("type");
