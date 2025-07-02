/*
  Warnings:

  - Made the column `imageUrl` on table `MenuPreviewItem` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "MenuPreviewItem_displayOrder_idx";

-- AlterTable
ALTER TABLE "MenuPreviewItem" ALTER COLUMN "imageUrl" SET NOT NULL;
