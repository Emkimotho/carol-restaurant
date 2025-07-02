-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "resumePublicId" TEXT;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "cloudinaryPublicId" TEXT,
ADD COLUMN     "imageUrl" TEXT;
