/*
  Warnings:

  - A unique constraint covering the columns `[sourceClientId,in_date]` on the table `DailyClientDetails` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DailyClientDetails" ADD COLUMN     "sourceClientId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "DailyClientDetails_sourceClientId_in_date_key" ON "DailyClientDetails"("sourceClientId", "in_date");
