-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "isAlcohol" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "ageVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "containsAlcohol" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "OrderStatusHistory" ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "changedBy" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "OrderStatusHistory_userId_idx" ON "OrderStatusHistory"("userId");

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
