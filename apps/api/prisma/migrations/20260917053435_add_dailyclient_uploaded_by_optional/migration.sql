/*
  Warnings:

  - A unique constraint covering the columns `[sourceClientId,in_date,uploadedById]` on the table `DailyClientDetails` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DailyClientDetails_sourceClientId_in_date_key";

-- AlterTable
ALTER TABLE "DailyClientDetails" ADD COLUMN     "uploadedById" INTEGER;

-- CreateIndex
CREATE INDEX "DailyClientDetails_uploadedById_idx" ON "DailyClientDetails"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "DailyClientDetails_sourceClientId_in_date_uploadedById_key" ON "DailyClientDetails"("sourceClientId", "in_date", "uploadedById");

-- AddForeignKey
ALTER TABLE "DailyClientDetails" ADD CONSTRAINT "DailyClientDetails_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
