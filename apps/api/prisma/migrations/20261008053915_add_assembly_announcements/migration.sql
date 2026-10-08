-- CreateEnum
CREATE TYPE "AssemblyStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "AssemblySmsStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "assembly_announcements" (
    "id" TEXT NOT NULL,
    "meetingDate" TIMESTAMP(3) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AssemblyStatus" NOT NULL DEFAULT 'PENDING',
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assembly_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assembly_recipients" (
    "id" TEXT NOT NULL,
    "assemblyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "status" "AssemblySmsStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assembly_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assembly_announcements_status_idx" ON "assembly_announcements"("status");

-- CreateIndex
CREATE INDEX "assembly_announcements_meetingDate_idx" ON "assembly_announcements"("meetingDate");

-- CreateIndex
CREATE INDEX "assembly_recipients_status_createdAt_idx" ON "assembly_recipients"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "assembly_recipients_assemblyId_agentId_key" ON "assembly_recipients"("assemblyId", "agentId");

-- AddForeignKey
ALTER TABLE "assembly_announcements" ADD CONSTRAINT "assembly_announcements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_recipients" ADD CONSTRAINT "assembly_recipients_assemblyId_fkey" FOREIGN KEY ("assemblyId") REFERENCES "assembly_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assembly_recipients" ADD CONSTRAINT "assembly_recipients_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
