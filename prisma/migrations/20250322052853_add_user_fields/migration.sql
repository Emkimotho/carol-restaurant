/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "aptSuite" VARCHAR(100),
ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "country" VARCHAR(50),
ADD COLUMN     "firstName" VARCHAR(100) NOT NULL,
ADD COLUMN     "lastName" VARCHAR(100) NOT NULL,
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "state" VARCHAR(50),
ADD COLUMN     "streetAddress" VARCHAR(255),
ADD COLUMN     "zip" VARCHAR(20);
