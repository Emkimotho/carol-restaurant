/*
  Warnings:

  - The `type` column on the `MenuCategory` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "MenuCategoryType" AS ENUM ('MainMenu', 'GolfMenu');

-- DropForeignKey
ALTER TABLE "MenuItem" DROP CONSTRAINT "MenuItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "MenuItemOptionGroup" DROP CONSTRAINT "MenuItemOptionGroup_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "MenuOptionChoice" DROP CONSTRAINT "MenuOptionChoice_optionGroupId_fkey";

-- DropForeignKey
ALTER TABLE "NestedOptionChoice" DROP CONSTRAINT "NestedOptionChoice_nestedGroupId_fkey";

-- DropForeignKey
ALTER TABLE "NestedOptionGroup" DROP CONSTRAINT "NestedOptionGroup_parentChoiceId_fkey";

-- AlterTable
ALTER TABLE "MenuCategory" DROP COLUMN "type",
ADD COLUMN     "type" "MenuCategoryType" NOT NULL DEFAULT 'MainMenu';

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOptionGroup" ADD CONSTRAINT "MenuItemOptionGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuOptionChoice" ADD CONSTRAINT "MenuOptionChoice_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "MenuItemOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NestedOptionGroup" ADD CONSTRAINT "NestedOptionGroup_parentChoiceId_fkey" FOREIGN KEY ("parentChoiceId") REFERENCES "MenuOptionChoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NestedOptionChoice" ADD CONSTRAINT "NestedOptionChoice_nestedGroupId_fkey" FOREIGN KEY ("nestedGroupId") REFERENCES "NestedOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
