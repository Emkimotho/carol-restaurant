/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `BlogNews` will be added. If there are existing duplicate values, this will fail.
  - Made the column `slug` on table `BlogNews` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "BlogNews" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BlogNews_slug_key" ON "BlogNews"("slug");
