/*
  Warnings:

  - A unique constraint covering the columns `[sourceClientId]` on the table `DailyClientDetails` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DailyClientDetails_sourceClientId_uploadedById_key";

-- CreateIndex
CREATE UNIQUE INDEX "DailyClientDetails_sourceClientId_key" ON "DailyClientDetails"("sourceClientId");
