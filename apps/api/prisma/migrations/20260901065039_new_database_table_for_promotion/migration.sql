-- CreateEnum
CREATE TYPE "RecoPromotionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PROMOTED', 'REJECTED');

-- CreateTable
CREATE TABLE "AgentRecomForPromotion" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "submittedByUserId" INTEGER,
    "status" "RecoPromotionStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentRecomForPromotion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentRecomForPromotion" ADD CONSTRAINT "AgentRecomForPromotion_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRecomForPromotion" ADD CONSTRAINT "AgentRecomForPromotion_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
