/*
  Warnings:

  - You are about to drop the column `govermentId` on the `agents` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "agents" DROP COLUMN "govermentId",
ADD COLUMN     "governmentId" TEXT;
