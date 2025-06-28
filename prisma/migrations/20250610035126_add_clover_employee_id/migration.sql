/*
  Warnings:

  - A unique constraint covering the columns `[cloverEmployeeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cloverEmployeeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_cloverEmployeeId_key" ON "User"("cloverEmployeeId");
