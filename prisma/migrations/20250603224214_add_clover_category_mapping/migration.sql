-- CreateTable
CREATE TABLE "CloverCategoryMapping" (
    "id" TEXT NOT NULL,
    "cloverCategoryId" TEXT NOT NULL,
    "cloverSubcategoryId" TEXT,
    "siteCategoryId" TEXT NOT NULL,
    "siteSubcategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CloverCategoryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CloverCategoryMapping_cloverCategoryId_cloverSubcategoryId_key" ON "CloverCategoryMapping"("cloverCategoryId", "cloverSubcategoryId");

-- AddForeignKey
ALTER TABLE "CloverCategoryMapping" ADD CONSTRAINT "CloverCategoryMapping_siteCategoryId_fkey" FOREIGN KEY ("siteCategoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloverCategoryMapping" ADD CONSTRAINT "CloverCategoryMapping_siteSubcategoryId_fkey" FOREIGN KEY ("siteSubcategoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
