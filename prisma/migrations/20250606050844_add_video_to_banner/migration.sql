-- CreateEnum
CREATE TYPE "BannerType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "BannerImage" ADD COLUMN     "type" "BannerType" NOT NULL DEFAULT 'IMAGE',
ADD COLUMN     "videoUrl" TEXT,
ALTER COLUMN "imageUrl" DROP NOT NULL;
