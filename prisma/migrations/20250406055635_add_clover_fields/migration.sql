-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "cloverItemId" TEXT,
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0;
