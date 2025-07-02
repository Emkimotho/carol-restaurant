/*
  Warnings:

  - You are about to drop the `GalleryImage` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[photoPublicId]` on the table `DriverProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cloudinaryPublicId]` on the table `Event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[photoPublicId]` on the table `StaffProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "photoPublicId" TEXT,
ALTER COLUMN "photoUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "cloudinaryPublicId" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "photoPublicId" TEXT,
ALTER COLUMN "photoUrl" DROP NOT NULL;

-- DropTable
DROP TABLE "GalleryImage";

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" SERIAL NOT NULL,
    "cloudinaryPublicId" TEXT,
    "imageUrl" TEXT,
    "alt" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_images_cloudinaryPublicId_key" ON "gallery_images"("cloudinaryPublicId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_photoPublicId_key" ON "DriverProfile"("photoPublicId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_cloudinaryPublicId_key" ON "Event"("cloudinaryPublicId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_photoPublicId_key" ON "StaffProfile"("photoPublicId");
