/*
  Warnings:

  - You are about to drop the `gallery_images` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "gallery_images";

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" SERIAL NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GalleryImage_cloudinaryPublicId_key" ON "GalleryImage"("cloudinaryPublicId");
