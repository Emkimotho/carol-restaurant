-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "image" TEXT,
    "hasSpiceLevel" BOOLEAN NOT NULL DEFAULT false,
    "showInGolfMenu" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemOptionGroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "minRequired" INTEGER NOT NULL,
    "maxAllowed" INTEGER,
    "optionType" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,

    CONSTRAINT "MenuItemOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuOptionChoice" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceAdjustment" DOUBLE PRECISION,
    "optionGroupId" TEXT NOT NULL,

    CONSTRAINT "MenuOptionChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NestedOptionGroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "minRequired" INTEGER NOT NULL,
    "maxAllowed" INTEGER,
    "parentChoiceId" TEXT NOT NULL,

    CONSTRAINT "NestedOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NestedOptionChoice" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "nestedGroupId" TEXT NOT NULL,

    CONSTRAINT "NestedOptionChoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NestedOptionGroup_parentChoiceId_key" ON "NestedOptionGroup"("parentChoiceId");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOptionGroup" ADD CONSTRAINT "MenuItemOptionGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuOptionChoice" ADD CONSTRAINT "MenuOptionChoice_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "MenuItemOptionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NestedOptionGroup" ADD CONSTRAINT "NestedOptionGroup_parentChoiceId_fkey" FOREIGN KEY ("parentChoiceId") REFERENCES "MenuOptionChoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NestedOptionChoice" ADD CONSTRAINT "NestedOptionChoice_nestedGroupId_fkey" FOREIGN KEY ("nestedGroupId") REFERENCES "NestedOptionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
