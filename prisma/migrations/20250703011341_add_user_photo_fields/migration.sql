/*
  Warnings:

  - A unique constraint covering the columns `[photoPublicId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "photoPublicId" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_photoPublicId_key" ON "User"("photoPublicId");
