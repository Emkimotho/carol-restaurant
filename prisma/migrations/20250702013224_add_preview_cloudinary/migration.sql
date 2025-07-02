-- AlterTable
ALTER TABLE "MenuPreviewItem" ADD COLUMN     "cloudinaryPublicId" TEXT,
ALTER COLUMN "imageUrl" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "MenuPreviewItem_displayOrder_idx" ON "MenuPreviewItem"("displayOrder");
