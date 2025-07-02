/*
  Warnings:

  - You are about to drop the column `image` on the `BlogNews` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[blogImagePublicId]` on the table `BlogNews` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BlogNews" DROP COLUMN "image",
ADD COLUMN     "blogImagePublicId" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "legacyImage" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BlogNews_blogImagePublicId_key" ON "BlogNews"("blogImagePublicId");
