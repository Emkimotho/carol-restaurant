/*
  Warnings:

  - A unique constraint covering the columns `[cloverCategoryId]` on the table `MenuCategory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cloverItemId]` on the table `MenuItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_cloverCategoryId_key" ON "MenuCategory"("cloverCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_cloverItemId_key" ON "MenuItem"("cloverItemId");
